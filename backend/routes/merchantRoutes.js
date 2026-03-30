const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/dashboard', merchantController.getDashboardOverview);
router.get('/reservations', merchantController.getAllReservations);
router.patch('/reservations/:id/confirm', merchantController.confirmReservation);
router.patch('/reservations/:id/reject', merchantController.rejectReservation);

module.exports = router;