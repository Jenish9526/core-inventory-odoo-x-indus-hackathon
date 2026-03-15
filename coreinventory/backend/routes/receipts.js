const express = require('express');
const router = express.Router();
const c = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.getReceipts);
router.post('/', c.createReceipt);
router.get('/:id', c.getReceipt);
router.patch('/:id', c.updateReceiptStatus);
router.post('/:id/validate', c.validateReceipt);

module.exports = router;
