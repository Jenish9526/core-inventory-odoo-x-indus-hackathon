const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createWarehouse, getWarehouses, getWarehouseStock, updateWarehouse } = require('../controllers/allControllers');
const { Warehouse } = require('../models');

// Public route — used by register page (no auth needed)
router.get('/public', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }, 'name location').sort('name');
    res.json({ success: true, data: warehouses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(protect);
router.get('/', getWarehouses);
router.post('/', authorize('manager'), createWarehouse);
router.put('/:id', authorize('manager'), updateWarehouse);
router.get('/:id/stock', getWarehouseStock);

module.exports = router;
