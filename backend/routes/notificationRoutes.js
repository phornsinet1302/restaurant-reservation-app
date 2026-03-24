const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes require the user to be logged in
router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead); // Put this BEFORE the /:id route!
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Our secret route to quickly generate tests
router.post('/test-create', notificationController.createTestNotification);

module.exports = router;