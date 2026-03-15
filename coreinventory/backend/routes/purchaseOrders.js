const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePOStatus } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrder);
router.post('/', createPurchaseOrder);
router.patch('/:id/status', authorize('manager'), updatePOStatus);

module.exports = router;
