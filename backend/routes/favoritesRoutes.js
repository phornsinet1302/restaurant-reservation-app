const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/:restaurant_id', favoritesController.addFavorite);
router.delete('/:restaurant_id', favoritesController.removeFavorite);
router.get('/', favoritesController.getMyFavorites);

module.exports = router;