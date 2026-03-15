/**
 * CoreInventory — Live Data Simulator
 * Generates realistic inventory activity attributed to staff by job role.
 */

const { Product, Warehouse, Stock, Receipt, Delivery, Transfer, Adjustment, StockLedger, User, PurchaseOrder } = require('./models/index');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];

const SUPPLIERS  = ['Tata Steel Ltd', 'JSW Steel Co.', 'Hindalco Industries', 'Reliance Industries', 'Bosch India', 'Schneider Electric', 'Siemens India', '3M India', 'Havells India', 'Polycab India'];
const CUSTOMERS  = ['L&T Construction', 'DLF Limited', 'Godrej Properties', 'Maruti Suzuki Vendors', 'Tata Motors Parts', 'Amazon Warehousing', 'Flipkart Supply', 'BHEL Projects', 'Voltas Ltd', 'ITC Limited'];
const ADJ_REASONS = ['Physical count', 'Damaged goods', 'Theft / Loss', 'Expiry', 'Data correction', 'Found in audit', 'QC rejection', 'Cold chain breach', 'Returns restocked'];

// Role → what operations they perform
const ROLE_OPS = {
  'Warehouse Supervisor':    ['receipt', 'delivery', 'adjustment'],
  'Inventory Coordinator':   ['receipt', 'delivery', 'adjustment'],
  'Receiving Clerk':         ['receipt'],
  'Stock Controller':        ['receipt', 'delivery', 'transfer'],
  'Dispatch Coordinator':    ['delivery'],
  'Production Store Keeper': ['receipt', 'transfer'],
  'Material Handler':        ['transfer'],
  'Forklift Operator':       ['transfer'],
  'Cold Chain Specialist':   ['receipt', 'transfer'],
  'Quality Inspector':       ['adjustment'],
  'Returns Processor':       ['receipt', 'adjustment'],
  'QC Analyst':              ['adjustment'],
};

let managerUser  = null;
let staffUsers   = [];   // { user, warehouse, jobRole }
let warehouseMap = {};   // id → warehouse doc
let productList  = [];

async function loadContext() {
  managerUser = await User.findOne({ role: 'manager' });
  const rawStaff = await User.find({ role: 'staff', isActive: true }).populate('warehouse');
  staffUsers = rawStaff.filter(s => s.warehouse).map(s => ({
    user: s, warehouse: s.warehouse, jobRole: s.jobRole || '',
  }));
  const whs = await Warehouse.find({ isActive: true });
  warehouseMap = {};
  whs.forEach(w => { warehouseMap[w._id.toString()] = w; });
  productList = await Product.find({ isActive: true });
}

// Pick a staff member who can do a given operation, optionally scoped to a warehouse
function pickStaffFor(op, warehouseId) {
  const eligible = staffUsers.filter(s => {
    const ops = ROLE_OPS[s.jobRole] || [];
    const whMatch = !warehouseId || s.warehouse._id.toString() === warehouseId.toString();
    return ops.includes(op) && whMatch;
  });
  if (eligible.length > 0) return pick(eligible);
  // fallback: any staff who can do this op
  const any = staffUsers.filter(s => (ROLE_OPS[s.jobRole] || []).includes(op));
  return any.length > 0 ? pick(any) : { user: managerUser, warehouse: Object.values(warehouseMap)[0], jobRole: 'Manager' };
}

// ── Receipt: Receiving Clerks, Supervisors, Store Keepers ────────────────────
async function simulateReceipt(io) {
  const actor    = pickStaffFor('receipt');
  const wh       = actor.warehouse;
  const numItems = rand(1, 4);
  const items    = [];

  const pickedProducts = [...productList].sort(() => Math.random() - 0.5).slice(0, numItems);
  for (const p of pickedProducts) {
    const qty = rand(10, 300);
    items.push({ product: p._id, warehouse: wh._id, quantity: qty, receivedQty: qty });
  }

  const count = await Receipt.countDocuments();
  const ref   = 'REC-' + String(count + 1).padStart(4, '0');

  const receipt = await Receipt.create({
    ref, supplier: pick(SUPPLIERS), status: 'Done',
    items, notes: `Auto PO #${rand(10000, 99999)}`,
    scheduledDate: new Date(), validatedAt: new Date(),
    createdBy: actor.user._id,
  });

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
      createdBy: actor.user._id,
    });
  }

  io.emit('stock:updated', { type: 'RECEIPT', ref, time: new Date() });
  io.emit('activity:new', { type: 'RECEIPT', ref, supplier: receipt.supplier, by: actor.user.name, role: actor.jobRole, time: new Date() });
  console.log(`[Sim] Receipt ${ref} by ${actor.user.name} (${actor.jobRole}) @ ${wh.name}`);
}

// ── Delivery: Dispatch Coordinators, Supervisors ─────────────────────────────
async function simulateDelivery(io) {
  const actor    = pickStaffFor('delivery');
  const wh       = actor.warehouse;
  const numItems = rand(1, 3);
  const items    = [];

  const pickedProducts = [...productList].sort(() => Math.random() - 0.5).slice(0, numItems);
  for (const p of pickedProducts) {
    const stock = await Stock.findOne({ product: p._id, warehouse: wh._id });
    if (!stock || stock.quantity < 5) continue;
    const qty = rand(1, Math.min(stock.quantity, 100));
    items.push({ product: p._id, warehouse: wh._id, quantity: qty, pickedQty: qty });
  }
  if (items.length === 0) return;

  const count = await Delivery.countDocuments();
  const ref   = 'DEL-' + String(count + 1).padStart(4, '0');

  const delivery = await Delivery.create({
    ref, customer: pick(CUSTOMERS), status: 'Done',
    items, notes: `SO #${rand(10000, 99999)}`,
    scheduledDate: new Date(), validatedAt: new Date(),
    createdBy: actor.user._id,
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
      createdBy: actor.user._id,
    });
    const product = productList.find(p => p._id.equals(item.product));
    if (stock && product && stock.quantity <= product.reorderLevel) {
      io.emit('stock:low', { productId: item.product, productName: product.name, quantity: stock.quantity, reorderLevel: product.reorderLevel });
    }
  }

  io.emit('stock:updated', { type: 'DELIVERY', ref, time: new Date() });
  io.emit('activity:new', { type: 'DELIVERY', ref, customer: delivery.customer, by: actor.user.name, role: actor.jobRole, time: new Date() });
  console.log(`[Sim] Delivery ${ref} by ${actor.user.name} (${actor.jobRole}) @ ${wh.name}`);
}

// ── Transfer: Forklift Operators, Material Handlers, Stock Controllers ────────
async function simulateTransfer(io) {
  const actor = pickStaffFor('transfer');
  const fromWH = actor.warehouse;

  // Pick a different warehouse to transfer to
  const otherWHs = Object.values(warehouseMap).filter(w => w._id.toString() !== fromWH._id.toString());
  if (otherWHs.length === 0) return;
  const toWH = pick(otherWHs);

  const p     = pick(productList);
  const stock = await Stock.findOne({ product: p._id, warehouse: fromWH._id });
  if (!stock || stock.quantity < 10) return;

  const qty   = rand(5, Math.min(stock.quantity, 80));
  const count = await Transfer.countDocuments();
  const ref   = 'TRF-' + String(count + 1).padStart(4, '0');

  await Transfer.create({
    ref, product: p._id, fromWarehouse: fromWH._id, toWarehouse: toWH._id,
    quantity: qty, status: 'Done',
    notes: pick(['Replenishment', 'Stock balancing', 'Production order', 'Cold chain move', 'QC hold']),
    completedAt: new Date(), createdBy: actor.user._id,
  });

  await Stock.findOneAndUpdate({ product: p._id, warehouse: fromWH._id }, { $inc: { quantity: -qty } });
  await Stock.findOneAndUpdate({ product: p._id, warehouse: toWH._id  }, { $inc: { quantity:  qty } }, { upsert: true });

  const fromStock = await Stock.findOne({ product: p._id, warehouse: fromWH._id });
  const toStock   = await Stock.findOne({ product: p._id, warehouse: toWH._id });

  await StockLedger.create({ product: p._id, warehouse: fromWH._id, type: 'TRANSFER_OUT', quantity: -qty, balanceAfter: fromStock?.quantity ?? 0, referenceRef: ref, note: 'Internal transfer out', createdBy: actor.user._id });
  await StockLedger.create({ product: p._id, warehouse: toWH._id,   type: 'TRANSFER_IN',  quantity:  qty, balanceAfter: toStock?.quantity  ?? 0, referenceRef: ref, note: 'Internal transfer in',  createdBy: actor.user._id });

  io.emit('stock:updated', { type: 'TRANSFER', ref, time: new Date() });
  io.emit('activity:new', { type: 'TRANSFER', ref, from: fromWH.name, to: toWH.name, by: actor.user.name, role: actor.jobRole, time: new Date() });
  console.log(`[Sim] Transfer ${ref} by ${actor.user.name} (${actor.jobRole}) ${fromWH.name} → ${toWH.name}`);
}

// ── Adjustment: QC Analysts, Quality Inspectors, Supervisors ─────────────────
async function simulateAdjustment(io) {
  const actor = pickStaffFor('adjustment');
  const wh    = actor.warehouse;
  const p     = pick(productList);
  const stock = await Stock.findOne({ product: p._id, warehouse: wh._id });
  if (!stock) return;

  const diff   = rand(-15, 10);
  const newQty = Math.max(0, stock.quantity + diff);
  const count  = await Adjustment.countDocuments();
  const ref    = 'ADJ-' + String(count + 1).padStart(4, '0');
  const reason = pick(ADJ_REASONS);

  await Adjustment.create({
    ref, product: p._id, warehouse: wh._id,
    previousQty: stock.quantity, newQty, difference: newQty - stock.quantity,
    reason, createdBy: actor.user._id,
  });

  await Stock.findOneAndUpdate({ product: p._id, warehouse: wh._id }, { quantity: newQty });
  await StockLedger.create({
    product: p._id, warehouse: wh._id, type: 'ADJUSTMENT',
    quantity: newQty - stock.quantity, balanceAfter: newQty,
    referenceRef: ref, note: reason, createdBy: actor.user._id,
  });

  io.emit('stock:updated', { type: 'ADJUSTMENT', ref, time: new Date() });
  io.emit('activity:new', { type: 'ADJUSTMENT', ref, reason, by: actor.user.name, role: actor.jobRole, time: new Date() });
  console.log(`[Sim] Adjustment ${ref} by ${actor.user.name} (${actor.jobRole}) @ ${wh.name} — ${p.name} (${diff >= 0 ? '+' : ''}${diff})`);
}

// ── Purchase Order ────────────────────────────────────────────────────────────
async function simulatePurchaseOrder(io) {
  const actor    = pickStaffFor('receipt'); // Supervisors / Coordinators raise POs
  const wh       = actor.warehouse;
  const numItems = rand(1, 4);
  const items    = [...productList].sort(() => Math.random() - 0.5).slice(0, numItems).map(p => ({
    product: p._id, warehouse: wh._id,
    quantity: rand(20, 200), unitCost: rand(5, 500),
  }));

  const count  = await PurchaseOrder.countDocuments();
  const ref    = 'PO-' + String(count + 1).padStart(4, '0');
  const status = pick(['Draft', 'Approved', 'Ordered', 'Received']);

  const po = await PurchaseOrder.create({
    ref, supplier: pick(SUPPLIERS), status, items,
    notes: `Auto-generated PO #${rand(10000, 99999)}`,
    expectedDate: new Date(Date.now() + rand(3, 14) * 86400000),
    approvedAt:  ['Approved', 'Ordered', 'Received'].includes(status) ? new Date() : undefined,
    receivedAt:  status === 'Received' ? new Date() : undefined,
    createdBy: actor.user._id,
  });

  if (status === 'Received') {
    for (const item of items) {
      await Stock.findOneAndUpdate({ product: item.product, warehouse: item.warehouse }, { $inc: { quantity: item.quantity } }, { upsert: true });
      const stock = await Stock.findOne({ product: item.product, warehouse: item.warehouse });
      await StockLedger.create({ product: item.product, warehouse: item.warehouse, type: 'RECEIPT', quantity: item.quantity, balanceAfter: stock.quantity, referenceRef: ref, note: `PO received from ${po.supplier}`, createdBy: actor.user._id });
    }
    io.emit('stock:updated', { type: 'PO_RECEIVED', ref, time: new Date() });
  }

  io.emit('activity:new', { type: 'PURCHASE_ORDER', ref, supplier: po.supplier, status, by: actor.user.name, role: actor.jobRole, time: new Date() });
  console.log(`[Sim] PO ${ref} by ${actor.user.name} (${actor.jobRole}) — ${po.supplier} (${status})`);
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
function startSimulator(io) {
  console.log('[Simulator] Starting live data simulator...');

  loadContext().then(() => {
    console.log(`[Simulator] Loaded ${productList.length} products, ${Object.keys(warehouseMap).length} warehouses, ${staffUsers.length} active staff`);

    // Receipt every 2–4 min
    setInterval(async () => { await loadContext(); await simulateReceipt(io); },    rand(2, 4)   * 60000);
    // Delivery every 1.5–3 min
    setInterval(async () => { await loadContext(); await simulateDelivery(io); },   rand(90, 180) * 1000);
    // Transfer every 4–7 min
    setInterval(async () => { await loadContext(); await simulateTransfer(io); },   rand(4, 7)   * 60000);
    // Adjustment every 6–10 min
    setInterval(async () => { await loadContext(); await simulateAdjustment(io); }, rand(6, 10)  * 60000);
    // PO every 3–6 min
    setInterval(async () => { await loadContext(); await simulatePurchaseOrder(io); }, rand(3, 6) * 60000);

    // Seed a few POs on start if empty
    PurchaseOrder.countDocuments().then(async count => {
      if (count === 0) for (let i = 0; i < 5; i++) await simulatePurchaseOrder(io);
    });

    // Clock tick every second
    setInterval(() => { io.emit('clock:tick', { time: new Date().toISOString() }); }, 1000);

  }).catch(err => console.error('[Simulator] Failed to load context:', err.message));
}

module.exports = { startSimulator };
