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

// In-memory OTP brute-force protection (resets on server restart)
const otpAttempts = new Map(); // email → { count, lockedUntil }
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

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

// A Secure cookie is dropped outright by the browser over plain HTTP, and the
// failure is silent: the login call succeeds, no cookie is stored, and the
// very next request is unauthenticated.
//
// PLAIN_HTTP is the one switch for a deployment with no TLS yet — it also
// drops upgrade-insecure-requests in app.js. Leave it unset anywhere served
// over HTTPS and this follows NODE_ENV exactly as before.
const cookieSecure = process.env.PLAIN_HTTP === 'true'
  ? false
  : process.env.NODE_ENV === 'production';

const authCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
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

// ── 2FA challenge ─────────────────────────────────────────────
// Proof that the password step passed. Issued by /login, required by
// /verify-otp and /request-otp, so an OTP can never be requested or used
// with just an email address.
const TWO_FA_TTL = '10m';

const signTwoFactorChallenge = (user) => jwt.sign(
  { id: user.id, email: user.email, type: '2fa' },
  process.env.JWT_SECRET,
  { expiresIn: TWO_FA_TTL }
);

// Returns the lower-cased email the challenge was issued for, or null.
const readTwoFactorChallenge = (challenge) => {
  if (!challenge || typeof challenge !== 'string') return null;
  try {
    const decoded = jwt.verify(challenge, process.env.JWT_SECRET);
    if (decoded.type !== '2fa' || !decoded.email) return null;
    return String(decoded.email).toLowerCase();
  } catch {
    return null;
  }
};

// Email the user an OTP. While their current code still has a couple of
// minutes left it is re-sent instead of replaced, so logging in twice or
// pressing "Resend" never turns the email already in their inbox into a
// wrong code. Returns false if the email could not be sent.
const OTP_TTL_MS   = 10 * 60 * 1000;
const OTP_REUSE_MS =  2 * 60 * 1000; // reuse only if at least this much is left

const issueAndSendOtp = async (user) => {
  const reusable = user.otpToken && user.otpExpiry
    && (new Date(user.otpExpiry).getTime() - Date.now()) > OTP_REUSE_MS;

  let otp = user.otpToken;
  if (!reusable) {
    otp = generateOtp();
    otpAttempts.delete(user.email.toLowerCase()); // fresh code, fresh attempts
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpToken: otp, otpExpiry: new Date(Date.now() + OTP_TTL_MS) },
    });
  }

  try {
    await sendOtpEmail(user.email, user.name, otp);
    return true;
  } catch (mailErr) {
    console.error('[2FA] OTP email failed for', user.email, '-', mailErr.message);
    // A code nobody received shouldn't stay live.
    if (!reusable) {
      await prisma.user.update({ where: { id: user.id }, data: { otpToken: null, otpExpiry: null } });
    }
    return false;
  }
};

const challengeRejected = (res) => res.status(401).json({
  success: false,
  code: 'ERR_2FA_CHALLENGE',
  message: 'Your login session has expired. Please sign in with your password again.',
});

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

    // ── Two-factor authentication (2FA) ─────────────────────────
    // Password verified, but tokens are NOT issued yet: an OTP is
    // emailed and the client is pointed to the OTP step. /verify-otp
    // finishes the login, sets the auth cookies and stamps lastLogin.
    if (!(await issueAndSendOtp(user))) {
      return res.status(503).json({
        success: false,
        code: 'ERR_EMAIL',
        message: 'Password is correct, but the OTP email could not be sent. Please contact the administrator.',
      });
    }

    return res.json({
      success: true,
      otpRequired: true,
      email: user.email,
      challenge: signTwoFactorChallenge(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Server error.' });
  }
};

// ── Resend OTP (2FA step 2 only — needs the password-step challenge) ──
exports.requestOtp = async (req, res) => {
  try {
    const email = readTwoFactorChallenge(req.body?.challenge);
    if (!email) return challengeRejected(res);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive)
      return res.status(404).json({ success: false, message: 'No account found with this email.' });

    if (!(await issueAndSendOtp(user))) {
      return res.status(503).json({ success: false, code: 'ERR_EMAIL', message: 'OTP email could not be sent. Please contact the administrator.' });
    }

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

// ── Verify OTP → returns JWT + Refresh Token ──────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    // The email comes from the password-step challenge, never from the client,
    // so the OTP alone (without the password) can't log anyone in.
    const emailKey = readTwoFactorChallenge(req.body?.challenge);
    if (!emailKey) return challengeRejected(res);
    if (!otp)
      return res.status(400).json({ success: false, code: 'ERR_INVALID_INPUT', message: 'OTP is required.' });

    // Brute-force check
    const attempt = otpAttempts.get(emailKey) || { count: 0, lockedUntil: null };
    if (attempt.lockedUntil && new Date() < attempt.lockedUntil) {
      const waitMin = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'ERR_LOCKED',
        message: `Too many failed attempts. Try again in ${waitMin} minute(s) or request a new OTP.`,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: emailKey } });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'Invalid credentials.' });

    if (user.otpToken !== otp) {
      attempt.count += 1;
      if (attempt.count >= OTP_MAX_ATTEMPTS) {
        attempt.lockedUntil = new Date(Date.now() + OTP_LOCKOUT_MS);
        attempt.count = 0;
      }
      otpAttempts.set(emailKey, attempt);
      const remaining = OTP_MAX_ATTEMPTS - attempt.count;
      return res.status(401).json({
        success: false,
        code: 'ERR_UNAUTHORIZED',
        message: attempt.lockedUntil
          ? 'Too many failed attempts. Account locked for 15 minutes.'
          : `Invalid OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return res.status(401).json({ success: false, code: 'ERR_UNAUTHORIZED', message: 'OTP has expired. Request a new one.' });

    // Success — clear lockout and OTP
    otpAttempts.delete(emailKey);
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
