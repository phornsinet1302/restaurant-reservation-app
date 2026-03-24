const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Import your auth middleware so we know WHO is making the request
const { protect } = require('../middleware/authMiddleware'); 

// This applies the 'protect' middleware to ALL routes in this file automatically!
router.use(protect); 

// The 6 Reservation Routes
router.post('/', reservationController.createReservation);
router.get('/my-reservations', reservationController.getMyReservations);
router.get('/:id', reservationController.getReservationDetails);
router.patch('/:id/status', reservationController.updateReservationStatus);
router.delete('/:id', reservationController.cancelReservation);
router.post('/:id/check-in', reservationController.checkIn);

module.exports = router;