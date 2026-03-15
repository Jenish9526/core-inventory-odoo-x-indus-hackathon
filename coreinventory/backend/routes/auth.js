// routes/auth.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/forgot-password', c.forgotPassword);
router.post('/verify-otp', c.verifyOTP);
router.post('/reset-password', c.resetPassword);
router.get('/me', protect, c.getMe);
router.put('/me', protect, c.updateMe);
router.put('/me/password', protect, c.changePassword);
router.delete('/me', protect, c.deleteAccount);
// Staff management (manager only)
router.get('/staff', protect, authorize('manager'), c.getStaff);
router.post('/staff', protect, authorize('manager'), c.createStaffMember);
router.get('/staff/:id', protect, authorize('manager'), c.getStaffMember);
router.put('/staff/:id', protect, authorize('manager'), c.updateStaffMember);
module.exports = router;
