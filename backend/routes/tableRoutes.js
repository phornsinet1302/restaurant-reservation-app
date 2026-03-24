const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { protect } = require('../middleware/authMiddleware');

// Public route
router.get('/', tableController.getAllTables);

// Protected routes (Requires Bearer Token)
router.post('/', protect, tableController.createTable);
router.put('/:id', protect, tableController.updateTable);
router.delete('/:id', protect, tableController.deleteTable);

module.exports = router;