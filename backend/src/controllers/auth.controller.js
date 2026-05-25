const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const prisma   = require('../utils/prisma');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');
const { parseCookies } = require('../utils/cookies');
const { toInt } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode } = require('../utils/validation');

// Generate 6-digit OTP using cryptographically secure random
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Generate cryptographically secure temporary password
const generateTempPassword = () => {
  const chars = crypto.randomBytes(12).toString('base64url').slice(0, 12);
  return chars + 'A1!x';
};

// Password strength validation
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = [
  { regex: /.{8,}/, message: 'Password must be at least 8 characters long' },
  { regex: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
  { regex: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
  { regex: /[0-9]/, message: 'Password must contain at least one digit' },
  { regex: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, message: 'Password must contain at least one special character' },
];

const validatePasswordStrength = (password) => {
  const failures = PASSWORD_RULES.filter(rule => !rule.regex.test(password));
  if (failures.length > 0) {
    return { valid: false, errors: failures.map(f => f.message) };
  }
  return { valid: true, errors: [] };
};

// ── Generate Access & Refresh Tokens ──────────────────────────
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  }

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, type: 'refresh' },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );

  return { accessToken, refreshToken };
};

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...authCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...authCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', authCookieOptions);
  res.clearCookie('refreshToken', authCookieOptions);
};

// ── Login with email + password → returns JWT + Refresh Token ──
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, code: 'ERR_INVALID_INPUT', message: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid credentials.' });

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Server error.' });
  }
};

// ── Request OTP (for email-based OTP login) ───────────────────
exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive)
      return res.status(404).json({ success: false, message: 'No account found with this email.' });

    const otp       = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data:  { otpToken: otp, otpExpiry },
    });

    await sendOtpEmail(user.email, user.name, otp);

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

// ── Verify OTP → returns JWT + Refresh Token ──────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, code: 'ERR_INVALID_INPUT', message: 'Email and OTP are required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid credentials.' });

    if (user.otpToken !== otp)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid OTP.' });

    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'OTP has expired. Request a new one.' });

    // Clear OTP after use
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpToken: null, otpExpiry: null, lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Server error.' });
  }
};

// ── Refresh Access Token ──────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const requestRefreshToken = req.body?.refreshToken;
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = requestRefreshToken || cookies.refreshToken;

    if (!refreshToken)
      return res.status(400).json({ success: false, code: 'ERR_INVALID_INPUT', message: 'Refresh token is required.' });

    // Verify refresh token
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      return res.status(500).json({ success: false, code: 'ERR_CONFIG', message: 'Server configuration error.' });
    }
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // Get user and generate new access token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'User not found or inactive.' });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Refresh token has expired. Please login again.' });
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid refresh token.' });
    
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Server error.' });
  }
};

// ── Logout ───────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Logout failed.' });
  }
};

// ── Get current user ──────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Change password ───────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both old and new password required.' });

    // Validate new password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(422).json({ success: false, code: 'ERR_WEAK_PASSWORD', message: 'Password does not meet strength requirements.', errors: strength.errors });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: Create User ────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role)
      return res.status(400).json({ success: false, message: 'Name, email, and role are required.' });

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists)
      return res.status(409).json({ success: false, message: 'Email already registered.' });

    // Auto-generate cryptographically secure temp password
    const tempPassword = generateTempPassword();
    const hashed       = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), password: hashed, role },
      select: { id: true, name: true, email: true, role: true },
    });

    await sendWelcomeEmail(user.email, user.name, tempPassword);

    res.status(201).json({ success: true, data: user, message: 'User created. Credentials sent by email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: List Users ─────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: Update user (name, role, reset password) ──────────
exports.updateUser = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { name, role, resetPassword } = req.body;

    // Prevent admin from changing their own role
    if (id === req.user.id && role && role !== req.user.role)
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;

    // Reset password — generates new temp password and emails it
    if (resetPassword) {
      const tempPassword  = generateTempPassword();
      updateData.password = await bcrypt.hash(tempPassword, 12);
      const target = await prisma.user.findUnique({ where: { id } });
      if (target) await sendWelcomeEmail(target.email, target.name, tempPassword);
    }

    const user = await prisma.user.update({
      where:  { id },
      data:   updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, data: user, message: 'User updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: Toggle user active ─────────────────────────────────
exports.toggleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user   = await prisma.user.findUnique({ where: { id: toInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: toInt(id) },
      data:  { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
