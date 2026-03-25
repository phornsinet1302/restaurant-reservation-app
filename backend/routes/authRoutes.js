const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const emailController = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

// --- Public Routes ---
router.get('/login-info', authController.loginInfo);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logoutUser);

// --- Email Routes ---
router.post('/send-verification-email', emailController.sendVerificationEmail);
router.post('/resend-verification-code', emailController.resendVerificationCode);
router.post('/send-password-reset-email', emailController.sendPasswordResetEmail);
router.post('/verify-email-code', authController.verifyEmailCode);

// --- OAuth Routes ---
router.post('/google-signup', authController.googleSignUp);
router.post('/google-login', authController.googleLogin);
router.post('/apple-signup', authController.appleSignUp);
router.post('/apple-login', authController.appleLogin);

// --- Protected Routes ---
router.get('/me', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile);
router.post('/reset-password', protect, authController.resetPassword);
router.post('/complete-profile-setup', protect, authController.completeProfileSetup);
router.get('/check-profile-completion', protect, authController.checkProfileCompletion);

module.exports = router;