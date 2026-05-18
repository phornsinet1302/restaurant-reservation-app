const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const emailController = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for profile picture uploads
const uploadProfilePicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);
router.post('/verify-email-code', authController.verifyEmailCode);

// --- OAuth Routes ---
router.post('/google-signup', authController.googleSignUp);
router.post('/google-login', authController.googleLogin);
router.post('/apple-signup', authController.appleSignUp);
router.post('/apple-login', authController.appleLogin);

// --- Web-based Google OAuth (for Android APK) ---
router.get('/google-oauth-init', authController.googleOAuthInit);
router.get('/google-oauth-callback', authController.googleOAuthCallback);

// --- Protected Routes ---
router.get('/me', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile);
router.post('/upload-profile-picture', protect, uploadProfilePicture.single('file'), authController.uploadProfilePicture);
router.post('/reset-password', protect, authController.resetPassword);
router.post('/complete-profile-setup', protect, authController.completeProfileSetup);
router.get('/check-profile-completion', protect, authController.checkProfileCompletion);
router.delete('/delete-account', protect, authController.deleteAccount);

module.exports = router;