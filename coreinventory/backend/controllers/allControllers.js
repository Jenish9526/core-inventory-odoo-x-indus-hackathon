const { Transfer, Adjustment, Warehouse, Stock, Product, Receipt, Delivery, StockLedger, PurchaseOrder } = require('../models');
const { addStock, deductStock, getLowStockAlerts } = require('../services/inventoryService');

// ── DELIVERIES ────────────────────────────────────────────────────────────
exports.createDelivery = async (req, res) => {
  try {
    let body = { ...req.body };
    if (req.user.role === 'staff' && req.user.warehouse) {
      const whId = req.user.warehouse._id || req.user.warehouse;
      body.items = (body.items || []).map(item => ({ ...item, warehouse: whId }));
    }
    const delivery = await Delivery.create({ ...body, createdBy: req.user._id });
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
    if (req.user.role === 'staff' && req.user.warehouse) {
      query['items.warehouse'] = req.user.warehouse._id || req.user.warehouse;
    }
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
    let body = { ...req.body };
    if (req.user.role === 'staff' && req.user.warehouse) {
      const whId = (req.user.warehouse._id || req.user.warehouse).toString();
      // Staff can only transfer FROM their warehouse
      body.fromWarehouse = whId;
    }
    const transfer = await Transfer.create({ ...body, createdBy: req.user._id });
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
    if (req.user.role === 'staff' && req.user.warehouse) {
      const whId = req.user.warehouse._id || req.user.warehouse;
      query.$or = [{ fromWarehouse: whId }, { toWarehouse: whId }];
    }
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
    const query = {};
    if (req.user.role === 'staff' && req.user.warehouse) {
      query.warehouse = req.user.warehouse._id || req.user.warehouse;
    }
    const [adj, total] = await Promise.all([
      Adjustment.find(query)
        .populate('product', 'name sku unit')
        .populate('warehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Adjustment.countDocuments(query),
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

exports.updateWarehouse = async (req, res) => {
  try {
    const wh = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!wh) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: wh });
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
    const whFilter = (req.user.role === 'staff' && req.user.warehouse)
      ? { 'items.warehouse': req.user.warehouse._id || req.user.warehouse }
      : {};
    const whTransferFilter = (req.user.role === 'staff' && req.user.warehouse)
      ? { $or: [{ 'items.warehouse': req.user.warehouse._id || req.user.warehouse }, { fromWarehouse: req.user.warehouse._id || req.user.warehouse }] }
      : {};
    const [totalProducts, pendingReceipts, pendingDeliveries, scheduledTransfers, lowStockAlerts] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Receipt.countDocuments({ status: { $in: ['Draft', 'Waiting', 'Ready'] }, ...whFilter }),
      Delivery.countDocuments({ status: { $in: ['Draft', 'Ready', 'In Transit'] }, ...whFilter }),
      Transfer.countDocuments({ status: { $in: ['Draft', 'In Transit'] }, ...whTransferFilter }),
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

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const [pos, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('items.product', 'name sku unit')
        .populate('items.warehouse', 'name')
        .populate('createdBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      PurchaseOrder.countDocuments(query),
    ]);
    res.json({ success: true, data: pos, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('items.product', 'name sku unit')
      .populate('items.warehouse', 'name')
      .populate('createdBy', 'name email');
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    res.json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.create({ ...req.body, createdBy: req.user._id });
    await po.populate('items.product items.warehouse');
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    const allowed = { Draft: ['Approved', 'Cancelled'], Approved: ['Ordered', 'Cancelled'], Ordered: ['Received', 'Cancelled'] };
    if (!allowed[po.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot move from ${po.status} to ${status}` });
    }
    po.status = status;
    if (status === 'Approved') po.approvedAt = new Date();
    if (status === 'Received') {
      po.receivedAt = new Date();
      // Auto-create a receipt
      const { addStock } = require('../services/inventoryService');
      for (const item of po.items) {
        await addStock({
          productId: item.product,
          warehouseId: item.warehouse,
          quantity: item.quantity,
          type: 'RECEIPT',
          referenceId: po._id,
          referenceRef: po.ref,
          note: `PO received from ${po.supplier}`,
          userId: req.user._id,
        });
      }
      const io = req.app.get('io');
      if (io) io.emit('stock_updated', { type: 'PO_RECEIVED', ref: po.ref });
    }
    await po.save();
    await po.populate('items.product items.warehouse createdBy');
    res.json({ success: true, data: po });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PRODUCT PERFORMANCE ───────────────────────────────────────────────────
exports.getProductPerformance = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [outbound, inbound, currentStock] = await Promise.all([
      StockLedger.aggregate([
        { $match: { type: 'DELIVERY', createdAt: { $gte: since } } },
        { $group: { _id: '$product', totalOut: { $sum: { $abs: '$quantity' } }, txCount: { $sum: 1 } } },
      ]),
      StockLedger.aggregate([
        { $match: { type: 'RECEIPT', createdAt: { $gte: since } } },
        { $group: { _id: '$product', totalIn: { $sum: '$quantity' } } },
      ]),
      Stock.aggregate([
        { $group: { _id: '$product', totalQty: { $sum: '$quantity' } } },
      ]),
    ]);

    const outMap = {}, inMap = {}, stockMap = {};
    outbound.forEach(r => { outMap[r._id] = r; });
    inbound.forEach(r => { inMap[r._id] = r; });
    currentStock.forEach(r => { stockMap[r._id] = r.totalQty; });

    const allProductIds = [...new Set([
      ...outbound.map(r => r._id.toString()),
      ...inbound.map(r => r._id.toString()),
    ])];

    const products = await Product.find({ _id: { $in: allProductIds }, isActive: true }, 'name sku category unit reorderLevel');

    const result = products.map(p => {
      const id = p._id.toString();
      const totalOut = outMap[id]?.totalOut || 0;
      const totalIn = inMap[id]?.totalIn || 0;
      const txCount = outMap[id]?.txCount || 0;
      const currentQty = stockMap[id] || 0;
      return { product: p, totalOut, totalIn, txCount, currentQty };
    }).sort((a, b) => b.totalOut - a.totalOut);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LEDGER ────────────────────────────────────────────────────────────────
exports.getLedger = async (req, res) => {
  try {
    const { product, warehouse, type, page = 1, limit = 30, dateFrom, dateTo } = req.query;
    const query = {};
    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;
    else if (req.user.role === 'staff' && req.user.warehouse) {
      query.warehouse = req.user.warehouse._id || req.user.warehouse;
    }
    if (type && type !== 'all') query.type = type;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); query.createdAt.$lte = d; }
    }
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
