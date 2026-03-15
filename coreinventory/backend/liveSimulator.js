/**
 * CoreInventory — Live Data Simulator
 * Generates realistic inventory activity in real-time.
 * Import and call startSimulator(io) from server.js
 */

const { Product, Warehouse, Stock, Receipt, Delivery, Transfer, Adjustment, StockLedger, User } = require('./models/index');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];

const SUPPLIERS = ['Tata Steel Ltd', 'JSW Steel Co.', 'Hindalco Industries', 'Reliance Industries', 'Bosch India', 'Schneider Electric', 'Siemens India', '3M India', 'Havells India', 'Polycab India'];
const CUSTOMERS = ['L&T Construction', 'DLF Limited', 'Godrej Properties', 'Maruti Suzuki Vendors', 'Tata Motors Parts', 'Amazon Warehousing', 'Flipkart Supply', 'BHEL Projects', 'Voltas Ltd', 'ITC Limited'];
const ADJ_REASONS = ['Physical count', 'Damaged goods', 'Theft / Loss', 'Expiry', 'Data correction', 'Found in audit'];

let managerUser = null;
let warehouseList = [];
let productList = [];

async function loadContext() {
  managerUser = await User.findOne({ role: 'manager' });
  warehouseList = await Warehouse.find({ isActive: true });
  productList = await Product.find({ isActive: true });
}

// ── Simulate a Receipt (goods arriving) ──────────────────────────────────────
async function simulateReceipt(io) {
  const wh = pick(warehouseList);
  const items = [];
  const numItems = rand(1, 4);
  const pickedProducts = [...productList].sort(() => Math.random() - 0.5).slice(0, numItems);

  for (const p of pickedProducts) {
    const qty = rand(10, 300);
    items.push({ product: p._id, warehouse: wh._id, quantity: qty, receivedQty: qty });
  }

  const count = await Receipt.countDocuments();
  const ref = 'REC-' + String(count + 1).padStart(4, '0');

  const receipt = await Receipt.create({
    ref, supplier: pick(SUPPLIERS), status: 'Done',
    items, notes: `Auto PO #${rand(10000, 99999)}`,
    scheduledDate: new Date(), validatedAt: new Date(),
    createdBy: managerUser._id,
  });

  // Update stock + ledger
  for (const item of items) {
    await Stock.findOneAndUpdate(
      { product: item.product, warehouse: item.warehouse },
      { $inc: { quantity: item.quantity } },
      { upsert: true }
    );
    const stock = await Stock.findOne({ product: item.product, warehouse: item.warehouse });
    await StockLedger.create({
      product: item.product, warehouse: item.warehouse,
      type: 'RECEIPT', quantity: item.quantity, balanceAfter: stock.quantity,
      referenceRef: ref, note: `Receipt from ${receipt.supplier}`,
      createdBy: managerUser._id,
    });
  }

  io.emit('stock:updated', { type: 'RECEIPT', ref, time: new Date() });
  io.emit('activity:new', { type: 'RECEIPT', ref, supplier: receipt.supplier, time: new Date() });
  console.log(`[Simulator] Receipt ${ref} — ${receipt.supplier}`);
}

// ── Simulate a Delivery (goods going out) ────────────────────────────────────
async function simulateDelivery(io) {
  const wh = pick(warehouseList.slice(0, 2)); // main/secondary only
  const numItems = rand(1, 3);
  const pickedProducts = [...productList].sort(() => Math.random() - 0.5).slice(0, numItems);
  const items = [];

  for (const p of pickedProducts) {
    const stock = await Stock.findOne({ product: p._id, warehouse: wh._id });
    if (!stock || stock.quantity < 5) continue;
    const qty = rand(1, Math.min(stock.quantity, 100));
    items.push({ product: p._id, warehouse: wh._id, quantity: qty, pickedQty: qty });
  }

  if (items.length === 0) return;

  const count = await Delivery.countDocuments();
  const ref = 'DEL-' + String(count + 1).padStart(4, '0');

  const delivery = await Delivery.create({
    ref, customer: pick(CUSTOMERS), status: 'Done',
    items, notes: `SO #${rand(10000, 99999)}`,
    scheduledDate: new Date(), validatedAt: new Date(),
    createdBy: managerUser._id,
  });

  for (const item of items) {
    await Stock.findOneAndUpdate(
      { product: item.product, warehouse: item.warehouse },
      { $inc: { quantity: -item.quantity } }
    );
    const stock = await Stock.findOne({ product: item.product, warehouse: item.warehouse });
    await StockLedger.create({
      product: item.product, warehouse: item.warehouse,
      type: 'DELIVERY', quantity: -item.quantity, balanceAfter: stock?.quantity ?? 0,
      referenceRef: ref, note: `Delivery to ${delivery.customer}`,
      createdBy: managerUser._id,
    });

    // Emit low stock alert if needed
    const product = productList.find(p => p._id.equals(item.product));
    if (stock && product && stock.quantity <= product.reorderLevel) {
      io.emit('stock:low', { productId: item.product, productName: product.name, quantity: stock.quantity, reorderLevel: product.reorderLevel });
    }
  }

  io.emit('stock:updated', { type: 'DELIVERY', ref, time: new Date() });
  io.emit('activity:new', { type: 'DELIVERY', ref, customer: delivery.customer, time: new Date() });
  console.log(`[Simulator] Delivery ${ref} — ${delivery.customer}`);
}

// ── Simulate a Transfer ───────────────────────────────────────────────────────
async function simulateTransfer(io) {
  if (warehouseList.length < 2) return;
  const [fromWH, toWH] = [...warehouseList].sort(() => Math.random() - 0.5).slice(0, 2);
  const p = pick(productList);
  const stock = await Stock.findOne({ product: p._id, warehouse: fromWH._id });
  if (!stock || stock.quantity < 10) return;

  const qty = rand(5, Math.min(stock.quantity, 80));
  const count = await Transfer.countDocuments();
  const ref = 'TRF-' + String(count + 1).padStart(4, '0');

  await Transfer.create({
    ref, product: p._id, fromWarehouse: fromWH._id, toWarehouse: toWH._id,
    quantity: qty, status: 'Done',
    notes: pick(['Replenishment', 'Stock balancing', 'Production order']),
    completedAt: new Date(), createdBy: managerUser._id,
  });

  await Stock.findOneAndUpdate({ product: p._id, warehouse: fromWH._id }, { $inc: { quantity: -qty } });
  await Stock.findOneAndUpdate({ product: p._id, warehouse: toWH._id }, { $inc: { quantity: qty } }, { upsert: true });

  const fromStock = await Stock.findOne({ product: p._id, warehouse: fromWH._id });
  const toStock = await Stock.findOne({ product: p._id, warehouse: toWH._id });

  await StockLedger.create({ product: p._id, warehouse: fromWH._id, type: 'TRANSFER_OUT', quantity: -qty, balanceAfter: fromStock?.quantity ?? 0, referenceRef: ref, note: 'Internal transfer out', createdBy: managerUser._id });
  await StockLedger.create({ product: p._id, warehouse: toWH._id, type: 'TRANSFER_IN', quantity: qty, balanceAfter: toStock?.quantity ?? 0, referenceRef: ref, note: 'Internal transfer in', createdBy: managerUser._id });

  io.emit('stock:updated', { type: 'TRANSFER', ref, time: new Date() });
  io.emit('activity:new', { type: 'TRANSFER', ref, from: fromWH.name, to: toWH.name, time: new Date() });
  console.log(`[Simulator] Transfer ${ref} — ${fromWH.name} → ${toWH.name}`);
}

// ── Simulate an Adjustment ────────────────────────────────────────────────────
async function simulateAdjustment(io) {
  const p = pick(productList);
  const wh = pick(warehouseList.slice(0, 2));
  const stock = await Stock.findOne({ product: p._id, warehouse: wh._id });
  if (!stock) return;

  const diff = rand(-15, 10);
  const newQty = Math.max(0, stock.quantity + diff);
  const count = await Adjustment.countDocuments();
  const ref = 'ADJ-' + String(count + 1).padStart(4, '0');

  await Adjustment.create({
    ref, product: p._id, warehouse: wh._id,
    previousQty: stock.quantity, newQty, difference: newQty - stock.quantity,
    reason: pick(ADJ_REASONS), createdBy: managerUser._id,
  });

  await Stock.findOneAndUpdate({ product: p._id, warehouse: wh._id }, { quantity: newQty });
  await StockLedger.create({
    product: p._id, warehouse: wh._id, type: 'ADJUSTMENT',
    quantity: newQty - stock.quantity, balanceAfter: newQty,
    referenceRef: ref, note: pick(ADJ_REASONS), createdBy: managerUser._id,
  });

  io.emit('stock:updated', { type: 'ADJUSTMENT', ref, time: new Date() });
  io.emit('activity:new', { type: 'ADJUSTMENT', ref, time: new Date() });
  console.log(`[Simulator] Adjustment ${ref} — ${p.name} (${diff > 0 ? '+' : ''}${diff})`);
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
function startSimulator(io) {
  console.log('[Simulator] Starting live data simulator...');

  loadContext().then(() => {
    console.log(`[Simulator] Loaded ${productList.length} products, ${warehouseList.length} warehouses`);

    // Receipt every 2–4 minutes
    setInterval(async () => {
      await loadContext();
      await simulateReceipt(io);
    }, rand(2, 4) * 60 * 1000);

    // Delivery every 1.5–3 minutes
    setInterval(async () => {
      await loadContext();
      await simulateDelivery(io);
    }, rand(90, 180) * 1000);

    // Transfer every 4–7 minutes
    setInterval(async () => {
      await loadContext();
      await simulateTransfer(io);
    }, rand(4, 7) * 60 * 1000);

    // Adjustment every 6–10 minutes
    setInterval(async () => {
      await loadContext();
      await simulateAdjustment(io);
    }, rand(6, 10) * 60 * 1000);

    // Emit a live clock tick every second for the frontend
    setInterval(() => {
      io.emit('clock:tick', { time: new Date().toISOString() });
    }, 1000);

  }).catch(err => console.error('[Simulator] Failed to load context:', err.message));
}

module.exports = { startSimulator };
