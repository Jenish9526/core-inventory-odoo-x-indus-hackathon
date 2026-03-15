const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getKPIs, getLowStock, getActivity, getProductPerformance } = require('../controllers/allControllers');

router.use(protect);
router.get('/kpis', getKPIs);
router.get('/low-stock', getLowStock);
router.get('/activity', getActivity);
router.get('/product-performance', getProductPerformance);

module.exports = router;
