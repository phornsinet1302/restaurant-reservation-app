const express = require('express');
const router = express.Router();
const multer = require('multer');
const menuPhotosController = require('../controllers/menuPhotosController');
const { protect } = require('../middleware/authMiddleware');

// Multer for image uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes
router.get('/:restaurantId', menuPhotosController.getMenuPhotos);

// Protected routes (merchant only)
router.post('/:restaurantId', protect, upload.single('image'), menuPhotosController.uploadMenuPhoto);
router.delete('/:photoId', protect, menuPhotosController.deleteMenuPhoto);
router.put('/:photoId', protect, menuPhotosController.updatePhotoOrder);

module.exports = router;
