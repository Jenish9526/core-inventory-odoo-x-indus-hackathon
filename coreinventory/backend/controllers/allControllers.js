const { Transfer, Adjustment, Warehouse, Stock, Product, Receipt, Delivery, StockLedger } = require('../models');
const { addStock, deductStock, getLowStockAlerts } = require('../services/inventoryService');

// ── DELIVERIES ────────────────────────────────────────────────────────────
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

// ── TRANSFERS ─────────────────────────────────────────────────────────────
exports.createTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.create({ ...req.body, createdBy: req.user._id });
    await transfer.populate('product fromWarehouse toWarehouse');
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const [transfers, total] = await Promise.all([
      Transfer.find(query)
        .populate('product', 'name sku unit')
        .populate('fromWarehouse toWarehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Transfer.countDocuments(query),
    ]);
    res.json({ success: true, data: transfers, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });
    if (transfer.status === 'Done') return res.status(400).json({ success: false, message: 'Already completed' });

    await deductStock({
      productId: transfer.product,
      warehouseId: transfer.fromWarehouse,
      quantity: transfer.quantity,
      type: 'TRANSFER_OUT',
      referenceId: transfer._id,
      referenceRef: transfer.ref,
      note: 'Transfer out',
      userId: req.user._id,
    });

    await addStock({
      productId: transfer.product,
      warehouseId: transfer.toWarehouse,
      quantity: transfer.quantity,
      type: 'TRANSFER_IN',
      referenceId: transfer._id,
      referenceRef: transfer.ref,
      note: 'Transfer in',
      userId: req.user._id,
    });

    transfer.status = 'Done';
    transfer.completedAt = new Date();
    await transfer.save();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'TRANSFER', ref: transfer.ref });

    await transfer.populate('product fromWarehouse toWarehouse');
    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── ADJUSTMENTS ───────────────────────────────────────────────────────────
exports.createAdjustment = async (req, res) => {
  try {
    const { product, warehouse, newQty, reason } = req.body;
    if (newQty === undefined || newQty === null) {
      return res.status(400).json({ success: false, message: 'newQty is required' });
    }

    let stock = await Stock.findOne({ product, warehouse });
    if (!stock) {
      stock = await Stock.create({ product, warehouse, quantity: 0 });
    }

    const previousQty = stock.quantity;
    const diff = Number(newQty) - previousQty;

    const adjustment = await Adjustment.create({
      product, warehouse, previousQty,
      newQty: Number(newQty), reason,
      createdBy: req.user._id,
    });

    await StockLedger.create({
      product, warehouse,
      type: 'ADJUSTMENT',
      quantity: diff,
      balanceAfter: Number(newQty),
      referenceId: adjustment._id,
      referenceRef: adjustment.ref,
      note: reason,
      createdBy: req.user._id,
    });

    stock.quantity = Number(newQty);
    await stock.save();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'ADJUSTMENT' });

    await adjustment.populate('product warehouse');
    res.status(201).json({ success: true, data: adjustment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAdjustments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [adj, total] = await Promise.all([
      Adjustment.find()
        .populate('product', 'name sku unit')
        .populate('warehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Adjustment.countDocuments(),
    ]);
    res.json({ success: true, data: adj, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── WAREHOUSES ────────────────────────────────────────────────────────────
exports.createWarehouse = async (req, res) => {
  try {
    const wh = await Warehouse.create(req.body);
    res.status(201).json({ success: true, data: wh });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).sort('name');
    const whIds = warehouses.map(w => w._id);
    const stockSummary = await Stock.aggregate([
      { $match: { warehouse: { $in: whIds } } },
      { $group: { _id: '$warehouse', totalSKUs: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
    ]);
    const map = {};
    stockSummary.forEach(s => { map[s._id.toString()] = s; });
    const enriched = warehouses.map(w => ({
      ...w.toObject(),
      totalSKUs: map[w._id.toString()]?.totalSKUs || 0,
      totalQty: map[w._id.toString()]?.totalQty || 0,
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWarehouseStock = async (req, res) => {
  try {
    const stocks = await Stock.find({ warehouse: req.params.id })
      .populate('product', 'name sku category unit reorderLevel');
    res.json({ success: true, data: stocks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────
exports.getKPIs = async (req, res) => {
  try {
    const [totalProducts, pendingReceipts, pendingDeliveries, scheduledTransfers, lowStockAlerts] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Receipt.countDocuments({ status: { $in: ['Draft', 'Waiting', 'Ready'] } }),
      Delivery.countDocuments({ status: { $in: ['Draft', 'Ready', 'In Transit'] } }),
      Transfer.countDocuments({ status: { $in: ['Draft', 'In Transit'] } }),
      getLowStockAlerts(),
    ]);
    res.json({
      success: true,
      data: {
        totalProducts, pendingReceipts, pendingDeliveries, scheduledTransfers,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount: lowStockAlerts.filter(a => a.totalQty === 0).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const alerts = await getLowStockAlerts();
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const ledger = await StockLedger.find()
      .sort('-createdAt')
      .limit(20)
      .populate('product', 'name sku')
      .populate('warehouse', 'name')
      .populate('createdBy', 'name');
    res.json({ success: true, data: ledger });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LEDGER ────────────────────────────────────────────────────────────────
exports.getLedger = async (req, res) => {
  try {
    const { product, warehouse, type, page = 1, limit = 30 } = req.query;
    const query = {};
    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;
    if (type && type !== 'all') query.type = type;
    const [ledger, total] = await Promise.all([
      StockLedger.find(query)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('product', 'name sku unit')
        .populate('warehouse', 'name')
        .populate('createdBy', 'name'),
      StockLedger.countDocuments(query),
    ]);
    res.json({ success: true, data: ledger, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
