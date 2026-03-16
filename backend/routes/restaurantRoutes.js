const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
// Use ONE name for your controller to keep it simple
const restaurantController = require('../controllers/restaurantController');

// --- PUBLIC ROUTES (Customer & Guest Mode) ---

// 1. Search/List Restaurants
router.get('/', restaurantController.getRestaurants);

// 3. Get Specific Restaurant Details
router.get('/:id', restaurantController.getRestaurantDetails);

// 4. Get Menu, Tables, and Media for a restaurant
router.get('/:id/menu', restaurantController.getRestaurantMenu);
router.get('/:id/tables', restaurantController.getRestaurantTables);
router.get('/:id/media', restaurantController.getRestaurantMedia);


// --- PROTECTED ROUTES (Merchant Only) ---

// 5. Create and Update Restaurant Profile
router.post('/', protect, restaurantController.createRestaurant);
router.put('/:id', protect, restaurantController.updateRestaurant);

// 6. Upload Stories/Media
router.post('/media', protect, restaurantController.uploadMedia);

module.exports = router;