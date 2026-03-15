// routes/auth.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/forgot-password', c.forgotPassword);
router.post('/verify-otp', c.verifyOTP);
router.post('/reset-password', c.resetPassword);
router.get('/me', protect, c.getMe);
module.exports = router;
