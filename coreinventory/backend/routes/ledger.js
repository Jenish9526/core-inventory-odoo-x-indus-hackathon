const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLedger } = require('../controllers/allControllers');

router.use(protect);
router.get('/', getLedger);

module.exports = router;
