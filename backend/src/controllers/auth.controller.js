const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const prisma   = require('../utils/prisma');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Login with email + password → returns JWT ─────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
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

// ── Verify OTP → returns JWT ──────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (user.otpToken !== otp)
      return res.status(401).json({ success: false, message: 'Invalid OTP.' });

    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return res.status(401).json({ success: false, message: 'OTP has expired. Request a new one.' });

    // Clear OTP after use
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpToken: null, otpExpiry: null, lastLogin: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
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

    // Auto-generate temp password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashed       = await bcrypt.hash(tempPassword, 10);

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
    const id = parseInt(req.params.id);
    const { name, role, resetPassword } = req.body;

    // Prevent admin from changing their own role
    if (id === req.user.id && role && role !== req.user.role)
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;

    // Reset password — generates new temp password and emails it
    if (resetPassword) {
      const tempPassword  = Math.random().toString(36).slice(-8) + 'A1!';
      updateData.password = await bcrypt.hash(tempPassword, 10);
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
    const user   = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data:  { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
