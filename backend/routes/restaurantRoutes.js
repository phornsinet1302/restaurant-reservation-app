const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const restaurantController = require('../controllers/restaurantController');

// --- PUBLIC ROUTES (Customer & Guest Mode) ---

// 1. Search/List Restaurants
router.get('/', restaurantController.getRestaurants);

// 2. Get Specific Restaurant Details
router.get('/:id', restaurantController.getRestaurantDetails);

// --- PROTECTED ROUTES (Merchant Only) ---

// 3. Create and Update Restaurant Profile
router.post('/', protect, restaurantController.createRestaurant);
router.put('/:id', protect, restaurantController.updateRestaurant);

module.exports = router;