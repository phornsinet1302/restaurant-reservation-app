const express = require('express');
const router = express.Router();
const storiesController = require('../controllers/storiesController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints - anyone can view
router.get('/restaurant/:restaurantId', storiesController.getRestaurantStories);
router.get('/active', storiesController.getAllActiveStories);

// Protected endpoints - merchant only
router.post('/', protect, storiesController.createStory);
router.delete('/:storyId', protect, storiesController.deleteStory);
router.get('/merchant/all', protect, storiesController.getMerchantStories);

module.exports = router;
