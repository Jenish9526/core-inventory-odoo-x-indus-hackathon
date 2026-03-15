const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// USER
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['manager', 'staff'], default: 'staff' },
  otp: String,
  otpExpiry: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// PRODUCT
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true },
  category: { type: String, required: true },
  unit: { type: String, required: true, default: 'pcs' },
  reorderLevel: { type: Number, default: 10 },
  description: String,
  barcode: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// WAREHOUSE
const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: String,
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// STOCK
const stockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
stockSchema.index({ product: 1, warehouse: 1 }, { unique: true });

// RECEIPT
const receiptItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 1 },
  receivedQty: { type: Number, default: 0 },
});
const receiptSchema = new mongoose.Schema({
  ref: { type: String, unique: true },
  supplier: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Cancelled'], default: 'Draft' },
  items: [receiptItemSchema],
  notes: String,
  scheduledDate: Date,
  validatedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
receiptSchema.pre('save', async function (next) {
  if (!this.ref) {
    const count = await mongoose.model('Receipt').countDocuments();
    this.ref = 'REC-' + String(count + 1).padStart(4, '0');
  }
  next();
});

// DELIVERY
const deliveryItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 1 },
  pickedQty: { type: Number, default: 0 },
});
const deliverySchema = new mongoose.Schema({
  ref: { type: String, unique: true },
  customer: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Ready', 'In Transit', 'Done', 'Cancelled'], default: 'Draft' },
  items: [deliveryItemSchema],
  notes: String,
  scheduledDate: Date,
  validatedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
deliverySchema.pre('save', async function (next) {
  if (!this.ref) {
    const count = await mongoose.model('Delivery').countDocuments();
    this.ref = 'DEL-' + String(count + 1).padStart(4, '0');
  }
  next();
});

// TRANSFER
const transferSchema = new mongoose.Schema({
  ref: { type: String, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['Draft', 'In Transit', 'Done', 'Cancelled'], default: 'Draft' },
  notes: String,
  scheduledDate: Date,
  completedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
transferSchema.pre('save', async function (next) {
  if (!this.ref) {
    const count = await mongoose.model('Transfer').countDocuments();
    this.ref = 'TRF-' + String(count + 1).padStart(4, '0');
  }
  next();
});

// ADJUSTMENT
const adjustmentSchema = new mongoose.Schema({
  ref: { type: String, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  previousQty: { type: Number, required: true },
  newQty: { type: Number, required: true },
  difference: Number,
  reason: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
adjustmentSchema.pre('save', async function (next) {
  if (!this.ref) {
    const count = await mongoose.model('Adjustment').countDocuments();
    this.ref = 'ADJ-' + String(count + 1).padStart(4, '0');
  }
  this.difference = this.newQty - this.previousQty;
  next();
});

// STOCK LEDGER
const stockLedgerSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  type: { type: String, enum: ['RECEIPT', 'DELIVERY', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'], required: true },
  quantity: { type: Number, required: true },
  balanceAfter: Number,
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceRef: String,
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Warehouse = mongoose.model('Warehouse', warehouseSchema);
const Stock = mongoose.model('Stock', stockSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);
const Delivery = mongoose.model('Delivery', deliverySchema);
const Transfer = mongoose.model('Transfer', transferSchema);
const Adjustment = mongoose.model('Adjustment', adjustmentSchema);
const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);

module.exports = { User, Product, Warehouse, Stock, Receipt, Delivery, Transfer, Adjustment, StockLedger };
