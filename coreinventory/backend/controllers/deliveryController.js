const { Delivery } = require('../models');
const { deductStock, getLowStockAlerts } = require('../services/inventoryService');

exports.createDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.create({ ...req.body, createdBy: req.user._id });
    await delivery.populate('items.product items.warehouse');
    res.status(201).json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate('items.product', 'name sku unit')
        .populate('items.warehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Delivery.countDocuments(query),
    ]);
    res.json({ success: true, data: deliveries, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('items.product', 'name sku unit')
      .populate('items.warehouse', 'name location')
      .populate('createdBy', 'name email');
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status === 'Done') return res.status(400).json({ success: false, message: 'Already validated' });

    for (const item of delivery.items) {
      await deductStock({
        productId: item.product,
        warehouseId: item.warehouse,
        quantity: item.quantity,
        type: 'DELIVERY',
        referenceId: delivery._id,
        referenceRef: delivery.ref,
        note: `Delivery to ${delivery.customer}`,
        userId: req.user._id,
      });
      item.pickedQty = item.quantity;
    }

    delivery.status = 'Done';
    delivery.validatedAt = new Date();
    await delivery.save();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'DELIVERY', ref: delivery.ref });

    const alerts = await getLowStockAlerts();
    if (alerts.length > 0 && io) io.emit('low_stock_alert', { count: alerts.length });

    await delivery.populate('items.product items.warehouse');
    res.json({ success: true, data: delivery, message: `Delivery ${delivery.ref} validated.` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
