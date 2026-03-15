const express = require('express');
const router = express.Router();
const c = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/categories', c.getCategories);
router.get('/', c.getProducts);
router.post('/', authorize('manager'), c.createProduct);
router.get('/:id', c.getProduct);
router.put('/:id', authorize('manager'), c.updateProduct);
router.delete('/:id', authorize('manager'), c.deleteProduct);

module.exports = router;
