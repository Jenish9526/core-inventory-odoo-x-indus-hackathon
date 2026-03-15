const { Receipt } = require('../models');
const { addStock, getLowStockAlerts } = require('../services/inventoryService');

exports.createReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.create({ ...req.body, createdBy: req.user._id });
    await receipt.populate('items.product items.warehouse');
    res.status(201).json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReceipts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .populate('items.product', 'name sku unit')
        .populate('items.warehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Receipt.countDocuments(query),
    ]);
    res.json({ success: true, data: receipts, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('items.product', 'name sku unit')
      .populate('items.warehouse', 'name location')
      .populate('createdBy', 'name email');
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateReceiptStatus = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (receipt.status === 'Done') return res.status(400).json({ success: false, message: 'Already validated' });
    receipt.status = req.body.status || receipt.status;
    await receipt.save();
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validateReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (receipt.status === 'Done') return res.status(400).json({ success: false, message: 'Already validated' });

    for (const item of receipt.items) {
      await addStock({
        productId: item.product,
        warehouseId: item.warehouse,
        quantity: item.quantity,
        type: 'RECEIPT',
        referenceId: receipt._id,
        referenceRef: receipt.ref,
        note: `Receipt from ${receipt.supplier}`,
        userId: req.user._id,
      });
      item.receivedQty = item.quantity;
    }

    receipt.status = 'Done';
    receipt.validatedAt = new Date();
    await receipt.save();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'RECEIPT', ref: receipt.ref });

    const alerts = await getLowStockAlerts();
    if (alerts.length > 0 && io) io.emit('low_stock_alert', { count: alerts.length });

    await receipt.populate('items.product items.warehouse');
    res.json({ success: true, data: receipt, message: `Receipt ${receipt.ref} validated. Stock updated.` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
