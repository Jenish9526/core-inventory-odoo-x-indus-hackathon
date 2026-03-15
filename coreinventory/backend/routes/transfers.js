const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createTransfer, getTransfers, completeTransfer } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getTransfers);
router.post('/', createTransfer);
router.post('/:id/complete', completeTransfer);

module.exports = router;
