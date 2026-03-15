const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createWarehouse, getWarehouses, getWarehouseStock } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getWarehouses);
router.post('/', authorize('manager'), createWarehouse);
router.get('/:id/stock', getWarehouseStock);

module.exports = router;
