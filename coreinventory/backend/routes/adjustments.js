const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createAdjustment, getAdjustments } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getAdjustments);
router.post('/', createAdjustment);

module.exports = router;
