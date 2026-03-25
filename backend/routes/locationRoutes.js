const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/restaurant/:restaurant_id', locationController.getRestaurantLocation);
router.get('/nearby', locationController.getNearbyRestaurants);
router.get('/distance', locationController.getDistance);

// Protected routes (merchant only)
router.patch('/restaurant/:restaurant_id', protect, locationController.updateRestaurantLocation);

module.exports = router;
