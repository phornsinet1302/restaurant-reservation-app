const express = require('express');
const router = express.Router();
const multer = require('multer');
const mediaController = require('../controllers/mediaController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for video uploads
const VIDEO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — realistic for Supabase free tier

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// Configure multer for image uploads
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public route to view media
router.get('/', mediaController.getRestaurantMedia);

router.use(protect);
router.post('/upload', mediaController.uploadMedia);
router.post('/upload-video', (req, res, next) => {
  uploadVideo.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `Video exceeds the ${VIDEO_MAX_BYTES / 1024 / 1024} MB upload limit. Please use a shorter or lower-quality clip.`,
        });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, mediaController.uploadVideoFile);
router.post('/upload-image', uploadImage.single('file'), mediaController.uploadImageFile);
router.post('/story', mediaController.uploadStory);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;