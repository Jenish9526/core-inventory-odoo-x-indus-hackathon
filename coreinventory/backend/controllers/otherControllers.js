const mongoose = require('mongoose');
const { Transfer, Adjustment, Warehouse, Stock, Product, Receipt, Delivery, StockLedger } = require('../models');
const { addStock, deductStock, getLowStockAlerts } = require('../services/inventoryService');

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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status === 'Done') throw new Error('Already completed');

    await deductStock({
      productId: transfer.product, warehouseId: transfer.fromWarehouse,
      quantity: transfer.quantity, type: 'TRANSFER_OUT',
      referenceId: transfer._id, referenceRef: transfer.ref,
      note: `Transfer to warehouse`, userId: req.user._id, session,
    });
    await addStock({
      productId: transfer.product, warehouseId: transfer.toWarehouse,
      quantity: transfer.quantity, type: 'TRANSFER_IN',
      referenceId: transfer._id, referenceRef: transfer.ref,
      note: `Transfer from warehouse`, userId: req.user._id, session,
    });

    transfer.status = 'Done';
    transfer.completedAt = new Date();
    await transfer.save({ session });
    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'TRANSFER', ref: transfer.ref });

    await transfer.populate('product fromWarehouse toWarehouse');
    res.json({ success: true, data: transfer });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ── ADJUSTMENTS ───────────────────────────────────────────────────────────
exports.createAdjustment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { product, warehouse, newQty, reason } = req.body;
    if (newQty === undefined || newQty === null) throw new Error('newQty is required');

    let stock = await Stock.findOne({ product, warehouse }).session(session);
    if (!stock) {
      const created = await Stock.create([{ product, warehouse, quantity: 0 }], { session });
      stock = created[0];
    }

    const previousQty = stock.quantity;
    const diff = Number(newQty) - previousQty;

    const adjustment = await Adjustment.create(
      [{ product, warehouse, previousQty, newQty: Number(newQty), reason, createdBy: req.user._id }],
      { session }
    );

    await StockLedger.create([{
      product, warehouse, type: 'ADJUSTMENT',
      quantity: diff, balanceAfter: Number(newQty),
      referenceId: adjustment[0]._id, referenceRef: adjustment[0].ref,
      note: reason, createdBy: req.user._id,
    }], { session });

    stock.quantity = Number(newQty);
    await stock.save({ session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) io.emit('stock_updated', { type: 'ADJUSTMENT' });

    await adjustment[0].populate('product warehouse');
    res.status(201).json({ success: true, data: adjustment[0] });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
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
