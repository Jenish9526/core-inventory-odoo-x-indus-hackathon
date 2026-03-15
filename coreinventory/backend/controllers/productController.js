const { Product, Stock } = require('../models');

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'SKU already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    const [products, total] = await Promise.all([
      Product.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      Product.countDocuments(query),
    ]);
    const productIds = products.map(p => p._id);
    const stocks = await Stock.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: '$product', totalQty: { $sum: '$quantity' } } },
    ]);
    const stockMap = {};
    stocks.forEach(s => { stockMap[s._id.toString()] = s.totalQty; });
    const enriched = products.map(p => {
      const totalStock = stockMap[p._id.toString()] || 0;
      return {
        ...p.toObject(),
        totalStock,
        stockStatus: totalStock === 0 ? 'out' : totalStock <= p.reorderLevel ? 'low' : 'ok',
      };
    });
    res.json({ success: true, data: enriched, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const stocks = await Stock.find({ product: product._id }).populate('warehouse', 'name location');
    res.json({ success: true, data: { ...product.toObject(), stocks } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const cats = await Product.distinct('category', { isActive: true });
    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
