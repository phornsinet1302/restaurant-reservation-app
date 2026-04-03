const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const restaurantController = require('../controllers/restaurantController');

// --- MERCHANT RESTAURANT LISTING MANAGEMENT (SPECIFIC ROUTES FIRST) ---

// 5. Get Merchant's Restaurant Listing
router.get('/merchant/my-restaurant', protect, restaurantController.getMerchantRestaurant);

// 6. Update Merchant's Restaurant Listing
router.put('/merchant/my-restaurant', protect, restaurantController.updateMerchantRestaurant);

// 7. Validate Restaurant Listing
router.post('/merchant/validate-listing', protect, restaurantController.validateRestaurantListing);

// 8. Publish Restaurant
router.post('/merchant/publish', protect, restaurantController.publishRestaurant);

// 9. Unpublish Restaurant
router.post('/merchant/unpublish', protect, restaurantController.unpublishRestaurant);

// DEBUG: Check all restaurants' image URLs
router.get('/debug/images', restaurantController.debugRestaurantImages);

// ADMIN: Set restaurant image URL (for testing/fixing)
router.post('/admin/set-image-url', restaurantController.setRestaurantImageUrl);

// --- PUBLIC ROUTES (Customer & Guest Mode) ---

// 1. Search/List Restaurants
router.get('/', restaurantController.searchRestaurants);

// 2. Get Specific Restaurant Details (GENERIC ROUTE LAST)
router.get('/:id', restaurantController.getRestaurantDetails);

// 3. Get Required Fields for Restaurant Listing
router.get('/info/required-fields', restaurantController.getRequiredFields);

// --- PROTECTED ROUTES (Merchant Only) ---

// 4. Create and Update Restaurant Profile
router.post('/', protect, restaurantController.createRestaurant);
router.put('/:id', protect, restaurantController.updateRestaurant);

module.exports = router;