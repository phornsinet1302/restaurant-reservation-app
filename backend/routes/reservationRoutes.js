const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Import your auth middleware so we know WHO is making the request
const { protect } = require('../middleware/authMiddleware'); 

// This applies the 'protect' middleware to ALL routes in this file automatically!
router.use(protect); 

// ===== MERCHANT ROUTES (MUST COME FIRST - MORE SPECIFIC) =====
router.get('/merchant/pending-reservations', reservationController.getMerchantPendingReservations);
router.patch('/merchant/:id/confirm', reservationController.merchantConfirmReservation);
router.patch('/merchant/:id/reject', reservationController.merchantRejectReservation);
router.patch('/merchant/:id/cancel', reservationController.merchantCancelReservation);
router.patch('/merchant/:id/mark-arrived', reservationController.merchantMarkArrived);
router.patch('/merchant/:id/mark-completed', reservationController.merchantMarkCompleted);

// ===== SPECIFIC ACTION ROUTES (BEFORE GENERIC/:id ROUTES) =====
router.patch('/:id/mark-arrived', reservationController.customerMarkArrived);
router.patch('/:id/mark-completed', reservationController.customerMarkCompleted);
router.patch('/:id/status', reservationController.updateReservationStatus);
router.patch('/:id/update', reservationController.updateReservationDetails);
router.post('/:id/check-in', reservationController.checkIn);
router.post('/:id/machine-confirm', reservationController.simulateMachineConfirmation);

// ===== GENERIC ROUTES (MUST COME LAST) =====
router.post('/', reservationController.createReservation);
router.get('/my-reservations/stats', reservationController.getMyReservationStats);
router.get('/my-reservations', reservationController.getMyReservations);
router.get('/:id', reservationController.getReservationDetails);
router.delete('/:id', reservationController.cancelReservation);

module.exports = router;