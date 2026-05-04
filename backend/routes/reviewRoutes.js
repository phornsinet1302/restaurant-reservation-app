const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public: list reviews + summary for a restaurant
router.get('/:restaurant_id', reviewController.listByRestaurant);

// Auth required for everything below
router.get('/:restaurant_id/mine', protect, reviewController.getMyReview);
router.post('/:restaurant_id', protect, reviewController.upsertReview);
router.delete('/review/:review_id', protect, reviewController.deleteReview);

module.exports = router;
