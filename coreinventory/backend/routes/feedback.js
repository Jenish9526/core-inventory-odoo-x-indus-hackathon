const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/feedbackController');

router.use(protect);
router.get('/stats', c.getFeedbackStats);
router.get('/', c.getFeedbacks);
router.post('/', c.createFeedback);
router.patch('/:id/review', c.reviewFeedback);
router.delete('/:id', c.deleteFeedback);

module.exports = router;
