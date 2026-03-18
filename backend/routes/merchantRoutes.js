const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { protect } = require('../middleware/authMiddleware');

// All merchant routes require the user to be logged in!
router.use(protect);

router.get('/dashboard', merchantController.getDashboardOverview);
router.get('/reservations', merchantController.getAllReservations);
router.patch('/reservations/:id/confirm', merchantController.confirmReservation);

module.exports = router;