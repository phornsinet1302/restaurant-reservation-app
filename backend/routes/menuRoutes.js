const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { protect } = require('../middleware/authMiddleware'); 

// Public routes (Customers don't need to log in just to look at a menu)
router.get('/', menuController.getMenuItems);
router.get('/:id', menuController.getMenuItemDetails);

// Protected routes (Only logged-in merchants should modify the menu)
router.use(protect); 
router.post('/', menuController.addMenuItem);
router.put('/:id', menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);

module.exports = router;