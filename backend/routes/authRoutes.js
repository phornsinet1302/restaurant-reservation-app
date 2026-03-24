const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// --- Public Routes ---
router.get('/login-info', authController.loginInfo); // Changed to avoid confusion with POST login
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logoutUser);
router.get('/me', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile);


module.exports = router;