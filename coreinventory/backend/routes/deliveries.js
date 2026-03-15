const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createDelivery, getDeliveries, getDelivery, validateDelivery } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getDeliveries);
router.post('/', createDelivery);
router.get('/:id', getDelivery);
router.post('/:id/validate', validateDelivery);

module.exports = router;
