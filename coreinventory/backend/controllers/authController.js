const jwt = require('jsonwebtoken');
const { User } = require('../models');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const formatUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, warehouse: u.warehouse, jobRole: u.jobRole, createdAt: u.createdAt, isActive: u.isActive });

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, warehouse, jobRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    const assignedRole = role || 'staff';
    if (assignedRole === 'staff' && !warehouse) return res.status(400).json({ success: false, message: 'Staff must be assigned to a warehouse' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: assignedRole, warehouse: warehouse || null, jobRole: jobRole || '' });
    const token = signToken(user._id);
    const populated = await User.findById(user._id).populate('warehouse', 'name location');
    res.status(201).json({ success: true, token, user: formatUser(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account disabled' });
    const token = signToken(user._id);
    const populated = await User.findById(user._id).populate('warehouse', 'name location');
    res.json({ success: true, token, user: formatUser(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with that email' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    // Always log OTP to console (visible in terminal)
    console.log(`\n========================================`);
    console.log(`  OTP for ${user.email}: ${otp}`);
    console.log(`  Expires in 10 minutes`);
    console.log(`========================================\n`);
    // Try to send email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email@gmail.com') {
      try {
        const { sendOTPEmail } = require('../utils/email');
        await sendOTPEmail(user.email, otp, user.name);
      } catch (emailErr) {
        console.warn('Email send failed (check EMAIL config):', emailErr.message);
      }
    }
    res.json({ success: true, message: 'OTP sent! Check your email or the server console.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email, otp, otpExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    user.password = password;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('warehouse', 'name location').select('-password -otp -otpExpiry');
  res.json({ success: true, user: formatUser(user) });
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, ...(req.body.jobRole !== undefined && { jobRole: req.body.jobRole }) },
      { new: true, runValidators: true }
    ).populate('warehouse', 'name location').select('-password -otp -otpExpiry');
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── STAFF MANAGEMENT (manager only) ─────────────────────────────────────
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .populate('warehouse', 'name location')
      .select('-password -otp -otpExpiry')
      .sort('name');
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStaffMember = async (req, res) => {
  try {
    const { Receipt, Delivery, Transfer, Adjustment, StockLedger } = require('../models');
    const id = req.params.id;
    const [user, receipts, deliveries, transfers, adjustments, ledger] = await Promise.all([
      User.findById(id).populate('warehouse', 'name location').select('-password -otp -otpExpiry'),
      Receipt.find({ createdBy: id }).sort('-createdAt').limit(20).populate('items.product', 'name sku').populate('items.warehouse', 'name'),
      Delivery.find({ createdBy: id }).sort('-createdAt').limit(20).populate('items.product', 'name sku').populate('items.warehouse', 'name'),
      Transfer.find({ createdBy: id }).sort('-createdAt').limit(20).populate('product', 'name sku').populate('fromWarehouse toWarehouse', 'name'),
      Adjustment.find({ createdBy: id }).sort('-createdAt').limit(20).populate('product', 'name sku').populate('warehouse', 'name'),
      StockLedger.find({ createdBy: id }).sort('-createdAt').limit(50).populate('product', 'name sku').populate('warehouse', 'name'),
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const stats = {
      totalReceipts: await Receipt.countDocuments({ createdBy: id }),
      totalDeliveries: await Delivery.countDocuments({ createdBy: id }),
      totalTransfers: await Transfer.countDocuments({ createdBy: id }),
      totalAdjustments: await Adjustment.countDocuments({ createdBy: id }),
    };
    res.json({ success: true, data: { user: formatUser(user), stats, receipts, deliveries, transfers, adjustments, ledger } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStaffMember = async (req, res) => {
  try {
    const { name, email, warehouse, isActive, jobRole } = req.body;
    if (!warehouse) return res.status(400).json({ success: false, message: 'Staff must be assigned to a warehouse' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'staff' },
      { name, email, warehouse, isActive, jobRole: jobRole || '' },
      { new: true, runValidators: true }
    ).populate('warehouse', 'name location').select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStaffMember = async (req, res) => {
  try {
    const { name, email, password, warehouse, jobRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (!warehouse) return res.status(400).json({ success: false, message: 'Staff must be assigned to a warehouse' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: 'staff', warehouse, jobRole: jobRole || '' });
    const populated = await User.findById(user._id).populate('warehouse', 'name location').select('-password -otp -otpExpiry');
    res.status(201).json({ success: true, data: formatUser(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.user._id, { password: hashed });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
