const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { protect } = require('../middleware/authMiddleware');

// Public route to view media
router.get('/', mediaController.getRestaurantMedia);

router.use(protect);
router.post('/upload', mediaController.uploadMedia);
router.post('/story', mediaController.uploadStory);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;