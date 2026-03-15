/**
 * CoreInventory — Complete Database Seeder
 * Run: node seed.js
 * Clear + reseed: node seed.js --clear
 *
 * Seeds:
 *  - 2 users (manager + staff)
 *  - 5 warehouses
 *  - 520+ products across 12 real categories
 *  - Stock records per product per warehouse
 *  - 80 receipts (with items)
 *  - 60 delivery orders (with items)
 *  - 40 internal transfers
 *  - 30 stock adjustments
 *  - Full stock ledger entries for every operation
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coreinventory';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const uid = () => new mongoose.Types.ObjectId();
const date = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);
const pad = (n, prefix, len = 4) => `${prefix}-${String(n).padStart(len, '0')}`;

// ─── Schemas (inline, no separate files needed) ───────────────────────────────
const userSchema = new mongoose.Schema({ name: String, email: String, password: String, role: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const warehouseSchema = new mongoose.Schema({ name: String, location: String, description: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const productSchema = new mongoose.Schema({ name: String, sku: String, category: String, unit: String, reorderLevel: Number, description: String, barcode: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const stockSchema = new mongoose.Schema({ product: mongoose.Schema.Types.ObjectId, warehouse: mongoose.Schema.Types.ObjectId, quantity: Number }, { timestamps: true });

const receiptItemSchema = new mongoose.Schema({ product: mongoose.Schema.Types.ObjectId, warehouse: mongoose.Schema.Types.ObjectId, quantity: Number, receivedQty: Number });
const receiptSchema = new mongoose.Schema({ ref: String, supplier: String, status: String, items: [receiptItemSchema], notes: String, scheduledDate: Date, validatedAt: Date, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true });

const deliveryItemSchema = new mongoose.Schema({ product: mongoose.Schema.Types.ObjectId, warehouse: mongoose.Schema.Types.ObjectId, quantity: Number, pickedQty: Number });
const deliverySchema = new mongoose.Schema({ ref: String, customer: String, status: String, items: [deliveryItemSchema], notes: String, scheduledDate: Date, validatedAt: Date, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true });

const transferSchema = new mongoose.Schema({ ref: String, product: mongoose.Schema.Types.ObjectId, fromWarehouse: mongoose.Schema.Types.ObjectId, toWarehouse: mongoose.Schema.Types.ObjectId, quantity: Number, status: String, notes: String, completedAt: Date, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true });
const adjustmentSchema = new mongoose.Schema({ ref: String, product: mongoose.Schema.Types.ObjectId, warehouse: mongoose.Schema.Types.ObjectId, previousQty: Number, newQty: Number, difference: Number, reason: String, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true });
const ledgerSchema = new mongoose.Schema({ product: mongoose.Schema.Types.ObjectId, warehouse: mongoose.Schema.Types.ObjectId, type: String, quantity: Number, balanceAfter: Number, referenceId: mongoose.Schema.Types.ObjectId, referenceRef: String, note: String, createdBy: mongoose.Schema.Types.ObjectId }, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Warehouse = mongoose.model('Warehouse', warehouseSchema);
const Product = mongoose.model('Product', productSchema);
const Stock = mongoose.model('Stock', stockSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);
const Delivery = mongoose.model('Delivery', deliverySchema);
const Transfer = mongoose.model('Transfer', transferSchema);
const Adjustment = mongoose.model('Adjustment', adjustmentSchema);
const StockLedger = mongoose.model('StockLedger', ledgerSchema);

// ─── WAREHOUSES ───────────────────────────────────────────────────────────────
const WAREHOUSES = [
  { name: 'Main Distribution Center', location: 'Plot 14, Industrial Estate, Sector 5', description: 'Primary hub for all raw material intake and finished goods dispatch' },
  { name: 'Secondary Storage Facility', location: 'Warehouse Zone B, GIDC Phase II', description: 'Overflow storage and secondary distribution point' },
  { name: 'Production Floor Store', location: 'Factory Building C, Ground Floor', description: 'Adjacent to production lines — holds WIP and daily consumption items' },
  { name: 'Cold Storage Unit', location: 'Refrigerated Block D, Food Park', description: 'Temperature-controlled storage for perishable and sensitive materials' },
  { name: 'Returns & QC Dock', location: 'Gate 3, Inspection Bay', description: 'Holds returned goods and items pending quality inspection' },
];

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
const SUPPLIERS = [
  'Tata Steel Ltd', 'JSW Steel Co.', 'Hindalco Industries', 'Ultratech Cement',
  'Reliance Industries', 'Bharat Petroleum', 'ACC Limited', 'Ambuja Cements',
  'Asian Paints Ltd', 'Berger Paints', 'Pidilite Industries', 'Finolex Cables',
  'Havells India', 'Polycab India', 'Supreme Industries', 'Astral Poly Technik',
  'Greenpanel Industries', 'Century Plyboards', 'Greenply Industries', 'Merino Industries',
  'Kajaria Ceramics', 'Somany Ceramics', 'Orient Bell Ltd', 'Nitco Tiles',
  'Ceat Tyres', 'Apollo Tyres', 'MRF Limited', 'Balkrishna Industries',
  'Bosch India', 'SKF India', 'FAG Bearings', 'Timken India',
  '3M India', 'Henkel India', 'Saint-Gobain India', 'Asahi India Glass',
  'Schneider Electric', 'Siemens India', 'ABB India', 'Crompton Greaves',
  'Mahindra Logistics', 'Blue Dart Express', 'Allcargo Logistics', 'TCI Express',
];

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
const CUSTOMERS = [
  'L&T Construction', 'Shapoorji Pallonji Group', 'DLF Limited', 'Godrej Properties',
  'Prestige Estates', 'Brigade Group', 'Sobha Ltd', 'Puravankara Ltd',
  'Kalpataru Ltd', 'Oberoi Realty', 'Mahindra Lifespaces', 'Indiabulls Real Estate',
  'NCC Limited', 'Simplex Infrastructures', 'KEC International', 'Techno Electric',
  'BHEL Projects', 'NTPC Contractors', 'ONGC Supply', 'Indian Oil Corp',
  'Maruti Suzuki Vendors', 'Tata Motors Parts', 'Hero MotoCorp', 'Bajaj Auto',
  'Voltas Ltd', 'Blue Star Ltd', 'Daikin India', 'Carrier Midea',
  'ITC Limited', 'Hindustan Unilever', 'Nestle India', 'Britannia Industries',
  'Dr. Reddys Labs', 'Sun Pharma', 'Cipla Ltd', 'Lupin Ltd',
  'Infosys Campus', 'Wipro Campus', 'TCS Projects', 'HCL Technologies',
  'Amazon Warehousing', 'Flipkart Supply', 'Meesho Fulfilment', 'Myntra Logistics',
];

// ─── PRODUCT DATA (520+ products across 12 categories) ───────────────────────
const PRODUCT_DATA = {

  'Steel & Metals': [
    ['Mild Steel Flat Bar 25x6mm', 'MS-FB-001', 'kg', 500, 500, '7207012345678'],
    ['Mild Steel Flat Bar 40x6mm', 'MS-FB-002', 'kg', 500, 450, '7207012345679'],
    ['MS Round Bar 12mm dia', 'MS-RB-012', 'kg', 1000, 600, '7207023456789'],
    ['MS Round Bar 16mm dia', 'MS-RB-016', 'kg', 1000, 800, '7207023456790'],
    ['MS Round Bar 20mm dia', 'MS-RB-020', 'kg', 1000, 550, '7207023456791'],
    ['MS Round Bar 25mm dia', 'MS-RB-025', 'kg', 800, 400, '7207023456792'],
    ['MS Square Bar 10x10mm', 'MS-SQ-010', 'kg', 400, 300, '7207034567890'],
    ['MS Square Bar 16x16mm', 'MS-SQ-016', 'kg', 400, 250, '7207034567891'],
    ['MS Angle 25x25x3mm', 'MS-ANG-001', 'kg', 600, 400, '7207045678901'],
    ['MS Angle 40x40x5mm', 'MS-ANG-002', 'kg', 600, 500, '7207045678902'],
    ['MS Angle 50x50x6mm', 'MS-ANG-003', 'kg', 600, 350, '7207045678903'],
    ['MS Channel 75x40mm', 'MS-CH-001', 'kg', 800, 600, '7207056789012'],
    ['MS Channel 100x50mm', 'MS-CH-002', 'kg', 800, 700, '7207056789013'],
    ['MS I-Beam 100x50mm', 'MS-IB-001', 'kg', 1000, 500, '7207067890123'],
    ['MS I-Beam 150x75mm', 'MS-IB-002', 'kg', 1000, 800, '7207067890124'],
    ['GI Sheet 0.5mm 8x4ft', 'GI-SH-005', 'pcs', 200, 150, '7207078901234'],
    ['GI Sheet 0.8mm 8x4ft', 'GI-SH-008', 'pcs', 200, 120, '7207078901235'],
    ['GI Sheet 1.0mm 8x4ft', 'GI-SH-010', 'pcs', 200, 100, '7207078901236'],
    ['HR Coil 2.0mm 1250mm wide', 'HR-CO-020', 'kg', 5000, 3000, '7207089012345'],
    ['CR Sheet 0.8mm 2440x1220mm', 'CR-SH-008', 'pcs', 300, 200, '7207090123456'],
    ['Stainless Steel 304 Sheet 1mm', 'SS-304-001', 'kg', 200, 150, '7207101234567'],
    ['Stainless Steel 316 Sheet 2mm', 'SS-316-002', 'kg', 150, 100, '7207101234568'],
    ['Aluminium Angle 25x25x3mm', 'AL-ANG-001', 'kg', 300, 200, '7207112345678'],
    ['Aluminium Sheet 1.5mm 8x4ft', 'AL-SH-015', 'pcs', 150, 80, '7207112345679'],
    ['Aluminium Pipe 25mm OD 2mm', 'AL-PP-025', 'm', 500, 200, '7207123456789'],
    ['Copper Pipe 15mm OD', 'CU-PP-015', 'm', 1000, 300, '7207134567890'],
    ['Copper Wire 1.5mm SWG', 'CU-WR-015', 'kg', 500, 200, '7207145678901'],
    ['Brass Rod 12mm dia', 'BR-RD-012', 'kg', 200, 100, '7207156789012'],
    ['GI Wire 10 SWG', 'GI-WR-010', 'kg', 300, 150, '7207167890123'],
    ['GI Wire 12 SWG', 'GI-WR-012', 'kg', 300, 200, '7207167890124'],
    ['MS ERW Pipe 15mm NB', 'MS-EP-015', 'm', 2000, 500, '7207178901234'],
    ['MS ERW Pipe 25mm NB', 'MS-EP-025', 'm', 2000, 600, '7207178901235'],
    ['MS ERW Pipe 50mm NB', 'MS-EP-050', 'm', 1500, 400, '7207178901236'],
    ['GI Pipe Class B 25mm NB', 'GI-PP-025', 'm', 1000, 300, '7207189012345'],
    ['GI Pipe Class B 40mm NB', 'GI-PP-040', 'm', 1000, 400, '7207189012346'],
    ['TMT Bar Fe500 8mm', 'TMT-8', 'kg', 5000, 2000, '7207190123456'],
    ['TMT Bar Fe500 10mm', 'TMT-10', 'kg', 5000, 2500, '7207190123457'],
    ['TMT Bar Fe500 12mm', 'TMT-12', 'kg', 5000, 3000, '7207190123458'],
    ['TMT Bar Fe500 16mm', 'TMT-16', 'kg', 5000, 2000, '7207190123459'],
    ['MS Plate 6mm 2400x1200', 'MS-PL-006', 'pcs', 100, 60, '7207201234567'],
  ],

  'Electrical & Electronics': [
    ['PVC Insulated Cable 1.5mm 100m', 'EL-CB-015', 'roll', 200, 100, '8544421234567'],
    ['PVC Insulated Cable 2.5mm 100m', 'EL-CB-025', 'roll', 200, 120, '8544421234568'],
    ['PVC Insulated Cable 4mm 100m', 'EL-CB-040', 'roll', 150, 80, '8544421234569'],
    ['PVC Insulated Cable 6mm 100m', 'EL-CB-060', 'roll', 100, 60, '8544421234570'],
    ['Armoured Cable 3Cx4mm 100m', 'EL-AC-3X4', 'roll', 80, 40, '8544432345678'],
    ['Armoured Cable 3Cx10mm 100m', 'EL-AC-3X10', 'roll', 50, 30, '8544432345679'],
    ['MCB 6A Single Pole', 'EL-MCB-6A', 'pcs', 500, 200, '8536201234567'],
    ['MCB 16A Single Pole', 'EL-MCB-16A', 'pcs', 500, 300, '8536201234568'],
    ['MCB 32A Double Pole', 'EL-MCB-32D', 'pcs', 200, 100, '8536201234569'],
    ['RCCB 40A 30mA 2P', 'EL-RCCB-40', 'pcs', 100, 60, '8536202345678'],
    ['Distribution Board 8-way TPN', 'EL-DB-8W', 'pcs', 50, 20, '8535902345678'],
    ['Distribution Board 16-way TPN', 'EL-DB-16W', 'pcs', 30, 15, '8535902345679'],
    ['Modular Switch 6A 1-way', 'EL-SW-6A1', 'pcs', 1000, 400, '8536501234567'],
    ['Modular Switch 16A 2-way', 'EL-SW-16A2', 'pcs', 500, 200, '8536501234568'],
    ['5-pin Socket 16A ISI', 'EL-SK-16A', 'pcs', 800, 300, '8536694567890'],
    ['LED Bulb 9W B22 Warmwhite', 'EL-LB-9W', 'pcs', 2000, 500, '8539214567890'],
    ['LED Bulb 12W E27 Coolwhite', 'EL-LB-12W', 'pcs', 2000, 600, '8539214567891'],
    ['LED Panel Light 18W Recessed', 'EL-PL-18W', 'pcs', 500, 200, '8539215678901'],
    ['LED Tube Light 20W 4ft', 'EL-TL-20W', 'pcs', 1000, 300, '8539216789012'],
    ['LED Street Light 50W IP65', 'EL-SL-50W', 'pcs', 100, 40, '8539217890123'],
    ['Exhaust Fan 6 inch 220V', 'EL-EF-6IN', 'pcs', 200, 80, '8414511234567'],
    ['Ceiling Fan 48 inch 3-blade', 'EL-CF-48', 'pcs', 150, 60, '8414512345678'],
    ['CCTV Camera 2MP Dome IP', 'EL-CC-2MP', 'pcs', 200, 80, '8525803456789'],
    ['CCTV DVR 8-channel H.265', 'EL-DVR-8CH', 'pcs', 50, 20, '8521904567890'],
    ['UPS 1KVA Online Single Phase', 'EL-UPS-1K', 'pcs', 50, 20, '8504405678901'],
    ['Inverter 3.5KVA Pure Sinewave', 'EL-INV-35K', 'pcs', 30, 10, '8504406789012'],
    ['Solar Panel 330W Poly', 'EL-SP-330', 'pcs', 200, 50, '8541407890123'],
    ['Conduit Pipe PVC 25mm 3m', 'EL-CP-25', 'pcs', 2000, 400, '3917228901234'],
    ['Conduit Pipe PVC 32mm 3m', 'EL-CP-32', 'pcs', 1500, 300, '3917228901235'],
    ['Cable Tray 100x50mm 3m', 'EL-CT-100', 'pcs', 500, 100, '8547209012345'],
    ['Junction Box 100x100 GI', 'EL-JB-100', 'pcs', 500, 200, '8538900123456'],
    ['Earthing Electrode 40mm Copper', 'EL-EE-40C', 'pcs', 100, 30, '8547211234567'],
    ['Transformer 10KVA 11kV/433V', 'EL-TR-10K', 'pcs', 5, 2, '8504312345678'],
    ['Switchgear Panel 200A TPN', 'EL-SG-200', 'pcs', 10, 3, '8537903456789'],
    ['Power Factor Capacitor 25KVAR', 'EL-PFC-25', 'pcs', 20, 8, '8532004567890'],
    ['Energy Meter 3-phase 4-wire', 'EL-EM-3P', 'pcs', 100, 30, '9028305678901'],
    ['Generator 15KVA Diesel Silent', 'EL-GEN-15', 'pcs', 10, 3, '8502006789012'],
    ['Voltage Stabilizer 5KVA', 'EL-VS-5K', 'pcs', 30, 10, '9032007890123'],
    ['Cable Lug 25mm Copper', 'EL-CL-25C', 'pcs', 2000, 500, '8546908901234'],
    ['Heat Shrink Sleeve 25mm', 'EL-HS-25', 'm', 1000, 200, '3919099012345'],
  ],

  'Plumbing & Piping': [
    ['CPVC Pipe 15mm 3m Hot/Cold', 'PL-CPVC-15', 'pcs', 500, 200, '3917228901236'],
    ['CPVC Pipe 20mm 3m Hot/Cold', 'PL-CPVC-20', 'pcs', 500, 250, '3917228901237'],
    ['CPVC Pipe 25mm 3m Hot/Cold', 'PL-CPVC-25', 'pcs', 300, 150, '3917228901238'],
    ['CPVC Elbow 15mm 90-degree', 'PL-ELB-15', 'pcs', 2000, 500, '3917229012345'],
    ['CPVC Tee 15mm Equal', 'PL-TEE-15', 'pcs', 1500, 400, '3917230123456'],
    ['PVC SWR Pipe 75mm 3m', 'PL-SWR-75', 'pcs', 300, 100, '3917231234567'],
    ['PVC SWR Pipe 110mm 3m', 'PL-SWR-110', 'pcs', 300, 120, '3917231234568'],
    ['PVC SWR Pipe 160mm 3m', 'PL-SWR-160', 'pcs', 200, 80, '3917231234569'],
    ['Single P-Trap 50mm PVC', 'PL-PT-050', 'pcs', 500, 200, '3917242345678'],
    ['Bottle Trap 32mm Chrome', 'PL-BT-032', 'pcs', 300, 100, '3917242345679'],
    ['Gate Valve 15mm Brass', 'PL-GV-015', 'pcs', 500, 150, '8481201234567'],
    ['Ball Valve 25mm PN16', 'PL-BV-025', 'pcs', 400, 150, '8481202345678'],
    ['Ball Valve 50mm PN16', 'PL-BV-050', 'pcs', 200, 80, '8481202345679'],
    ['Pressure Reducing Valve 15mm', 'PL-PRV-15', 'pcs', 100, 40, '8481203456789'],
    ['Float Valve 15mm Brass', 'PL-FLV-15', 'pcs', 200, 80, '8481204567890'],
    ['Flush Valve 32mm', 'PL-FV-032', 'pcs', 150, 60, '8481205678901'],
    ['Water Meter 15mm Class B', 'PL-WM-015', 'pcs', 100, 30, '9028306789012'],
    ['Pressure Gauge 0-10 bar 100mm', 'PL-PG-010', 'pcs', 100, 40, '9026207890123'],
    ['Centrifugal Pump 0.5HP', 'PL-CP-05H', 'pcs', 30, 10, '8413708901234'],
    ['Submersible Pump 1HP 3-phase', 'PL-SP-1H3', 'pcs', 20, 8, '8413709012345'],
    ['Water Tank 500L Poly Black', 'PL-WT-500', 'pcs', 50, 15, '3925210123456'],
    ['Water Tank 1000L Poly Black', 'PL-WT-1K', 'pcs', 30, 10, '3925210123457'],
    ['Overhead Tank 5000L LLDPE', 'PL-OHT-5K', 'pcs', 10, 4, '3925210123458'],
    ['Solar Water Heater 150LPD', 'PL-SWH-150', 'pcs', 15, 5, '8419901234567'],
    ['Water Heater 25L Storage', 'PL-WH-025', 'pcs', 40, 15, '8516902345678'],
    ['Plumber Tape PTFE 12mm', 'PL-PTFE-12', 'roll', 3000, 500, '3919093456789'],
    ['Pipe Insulation 15mm 1m', 'PL-INS-15', 'm', 2000, 400, '3917234567890'],
    ['Copper Compression Elbow 15mm', 'PL-CCE-15', 'pcs', 1000, 300, '3917235678901'],
    ['Flexible Hose 12mm 40cm', 'PL-FH-12', 'pcs', 500, 150, '3917236789012'],
    ['Non-Return Valve 15mm', 'PL-NRV-15', 'pcs', 300, 100, '8481207890123'],
  ],

  'Civil & Construction': [
    ['OPC 53 Grade Cement 50kg', 'CV-CEM-53', 'bag', 5000, 2000, '2523291234567'],
    ['PPC Cement 50kg', 'CV-CEM-PPC', 'bag', 3000, 1500, '2523292345678'],
    ['White Cement 50kg', 'CV-CEM-WHT', 'bag', 500, 200, '2523293456789'],
    ['River Sand 40kg bag', 'CV-SAND-RV', 'bag', 10000, 3000, '2505004567890'],
    ['M-Sand 40kg bag', 'CV-SAND-M', 'bag', 10000, 4000, '2505005678901'],
    ['20mm Crushed Aggregate bag', 'CV-AGG-20', 'bag', 5000, 2000, '2517006789012'],
    ['10mm Crushed Aggregate bag', 'CV-AGG-10', 'bag', 5000, 2000, '2517007890123'],
    ['Fly Ash 50kg bag', 'CV-FA-050', 'bag', 2000, 800, '2520108901234'],
    ['Waterproofing Compound 30kg', 'CV-WPC-30', 'kg', 500, 200, '3214009012345'],
    ['Bonding Agent 1L', 'CV-BA-001', 'L', 300, 100, '3214100123456'],
    ['AAC Block 600x200x150mm', 'CV-AAC-150', 'pcs', 20000, 5000, '6810001234567'],
    ['Red Brick Class A', 'CV-RBK-A', 'pcs', 100000, 30000, '6901002345678'],
    ['Wire Cut Brick', 'CV-WCB-STD', 'pcs', 50000, 20000, '6901003456789'],
    ['Concrete Block 400x200x200', 'CV-CCB-200', 'pcs', 30000, 10000, '6810004567890'],
    ['Gypsum Plaster 40kg', 'CV-GP-040', 'bag', 1000, 400, '2520205678901'],
    ['Wall Putty 20kg', 'CV-WP-020', 'kg', 2000, 800, '3214206789012'],
    ['Tile Adhesive 20kg', 'CV-TA-020', 'bag', 1500, 500, '3214207890123'],
    ['Tile Grout 5kg Grey', 'CV-TG-GRY', 'kg', 1000, 300, '3214308901234'],
    ['Epoxy Grout 1kg White', 'CV-EG-WHT', 'kg', 500, 100, '3214309012345'],
    ['Curing Compound 20L', 'CV-CC-020', 'L', 200, 80, '3821100123456'],
    ['Shuttering Plywood 12mm', 'CV-SPW-12', 'pcs', 500, 150, '4412001234567'],
    ['H-Frame Scaffolding Set', 'CV-HFS-STD', 'set', 50, 20, '7308002345678'],
    ['Acrow Prop Adjustable', 'CV-APR-ADJ', 'pcs', 200, 80, '7308003456789'],
    ['Binding Wire 16 SWG 10kg', 'CV-BW-16', 'coil', 1000, 300, '7217104567890'],
    ['Chicken Mesh 1mx25m', 'CV-CM-1M', 'roll', 300, 100, '7314205678901'],
    ['Geo Fabric 1mx50m', 'CV-GF-1M', 'roll', 100, 40, '5911906789012'],
    ['Waterproof Membrane 1mx10m', 'CV-WPM-1M', 'roll', 200, 60, '3921007890123'],
    ['Foam Concrete Block 600x200', 'CV-FCB-200', 'pcs', 5000, 1500, '6810108901234'],
    ['Floor Hardener 25kg Metallic', 'CV-FH-25', 'bag', 300, 100, '3214109012345'],
    ['Admixture Superplasticiser 20L', 'CV-ADM-SP', 'L', 300, 100, '3812200123456'],
  ],

  'Hardware & Fasteners': [
    ['Hex Bolt M10x50mm Grade 8.8', 'HW-HB-M10', 'pcs', 5000, 1000, '7318151234567'],
    ['Hex Bolt M12x60mm Grade 8.8', 'HW-HB-M12', 'pcs', 5000, 1500, '7318151234568'],
    ['Hex Bolt M16x80mm Grade 8.8', 'HW-HB-M16', 'pcs', 3000, 1000, '7318151234569'],
    ['Allen Key Bolt M8x30mm', 'HW-AKB-M8', 'pcs', 5000, 1500, '7318152345678'],
    ['Stainless Bolt M6x20mm', 'HW-SSB-M6', 'pcs', 5000, 2000, '7318153456789'],
    ['Hex Nut M10 Grade 8', 'HW-HN-M10', 'pcs', 10000, 3000, '7318154567890'],
    ['Hex Nut M12 Grade 8', 'HW-HN-M12', 'pcs', 10000, 4000, '7318154567891'],
    ['Spring Washer M10', 'HW-SW-M10', 'pcs', 10000, 3000, '7318155678901'],
    ['Flat Washer M12 GI', 'HW-FW-M12', 'pcs', 10000, 4000, '7318156789012'],
    ['Self-Drilling Screw 4.2x32mm', 'HW-SDS-4X32', 'pcs', 10000, 2000, '7318157890123'],
    ['Wood Screw 4x30mm', 'HW-WS-4X30', 'pcs', 10000, 2000, '7318158901234'],
    ['Concrete Anchor M10x120mm', 'HW-CA-M10', 'pcs', 2000, 500, '7318159012345'],
    ['Chemical Anchor 300ml', 'HW-CHA-300', 'pcs', 200, 60, '3214000123456'],
    ['Rivets Blind 4mm Aluminium', 'HW-RV-4AL', 'pcs', 10000, 2000, '7318201234567'],
    ['Rivet Nut M8 Steel', 'HW-RN-M8', 'pcs', 5000, 1000, '7318202345678'],
    ['Cotter Pin 4mm x 40mm', 'HW-CP-4X40', 'pcs', 5000, 1000, '7318203456789'],
    ['Roll Pin 6mm x 30mm', 'HW-RP-6X30', 'pcs', 3000, 800, '7318204567890'],
    ['Dowel Pin 8mm x 50mm', 'HW-DP-8X50', 'pcs', 3000, 1000, '7318205678901'],
    ['Toggle Bolt M6 Wing Nut', 'HW-TB-M6W', 'pcs', 2000, 500, '7318206789012'],
    ['U-Bolt M10 60mm span', 'HW-UB-M10', 'pcs', 1000, 300, '7318207890123'],
    ['Eye Bolt M10x100mm', 'HW-EB-M10', 'pcs', 1000, 300, '7318208901234'],
    ['Chain 6mm Short Link GI', 'HW-CH-6SL', 'm', 500, 100, '7315009012345'],
    ['Wire Rope 6mm 7x7 Galv', 'HW-WR-6MM', 'm', 1000, 200, '7312100123456'],
    ['Hinge Piano 2.4m SS', 'HW-HP-24SS', 'pcs', 500, 100, '8302101234567'],
    ['Door Hinge 4x3 SS', 'HW-DH-4X3', 'pcs', 2000, 500, '8302102345678'],
    ['Padlock 50mm Heavy Duty', 'HW-PL-50HD', 'pcs', 500, 100, '8301103456789'],
    ['Drill Bit HSS 6mm', 'HW-DB-6HS', 'pcs', 1000, 200, '8207104567890'],
    ['Drill Bit HSS 10mm', 'HW-DB-10HS', 'pcs', 1000, 300, '8207104567891'],
    ['Masonry Drill Bit 10mm', 'HW-DB-10MA', 'pcs', 1000, 300, '8207105678901'],
    ['Grinding Disc 115mm 60 grit', 'HW-GD-115', 'pcs', 2000, 500, '6804206789012'],
    ['Cutting Disc 115mm Inox', 'HW-CD-115I', 'pcs', 2000, 500, '6804207890123'],
    ['Flap Disc 115mm 80 grit', 'HW-FD-115', 'pcs', 1000, 300, '6804208901234'],
    ['Hacksaw Blade 300mm 24TPI', 'HW-HS-24T', 'pcs', 2000, 500, '8202009012345'],
    ['Thread Tap Set M6-M16', 'HW-TT-SET', 'set', 200, 50, '8207110123456'],
    ['Die Set M6-M16 Round', 'HW-DS-SET', 'set', 200, 50, '8207111234567'],
    ['Pipe Wrench 14 inch', 'HW-PW-14', 'pcs', 100, 30, '8205112345678'],
    ['Adjustable Spanner 12 inch', 'HW-AS-12', 'pcs', 200, 50, '8205113456789'],
    ['Torque Wrench 1/2 Dr 20-100Nm', 'HW-TW-100', 'pcs', 50, 10, '8205114567890'],
    ['Vernier Caliper Digital 150mm', 'HW-VC-150', 'pcs', 100, 30, '9017215678901'],
    ['Spirit Level 1200mm Aluminium', 'HW-SL-120', 'pcs', 100, 30, '9017216789012'],
  ],

  'Safety & PPE': [
    ['Safety Helmet IS:2925 Yellow', 'SF-HLM-YEL', 'pcs', 500, 100, '6506101234567'],
    ['Safety Helmet IS:2925 White', 'SF-HLM-WHT', 'pcs', 500, 100, '6506101234568'],
    ['Safety Helmet IS:2925 Red', 'SF-HLM-RED', 'pcs', 300, 80, '6506101234569'],
    ['Safety Shoes Steel Toe S3', 'SF-SHO-S3', 'pair', 200, 50, '6403191234567'],
    ['Safety Shoes Composite S1P', 'SF-SHO-S1P', 'pair', 150, 40, '6403192345678'],
    ['Safety Gloves Leather Palm', 'SF-GLV-LPM', 'pair', 1000, 200, '6216103456789'],
    ['Safety Gloves Nitrile Coated', 'SF-GLV-NIT', 'pair', 1000, 300, '6216104567890'],
    ['Safety Gloves Cut-Resistant L5', 'SF-GLV-CR5', 'pair', 300, 80, '6216105678901'],
    ['Welding Gloves Kevlar', 'SF-WGV-KEV', 'pair', 200, 60, '6216106789012'],
    ['Safety Goggles Anti-Fog', 'SF-GOG-AF', 'pcs', 500, 100, '9004907890123'],
    ['Face Shield Polycarbonate', 'SF-FSH-PC', 'pcs', 200, 50, '9004908901234'],
    ['Welding Mask Auto-Darkening', 'SF-WMK-AD', 'pcs', 100, 20, '9004909012345'],
    ['Earmuff NRR 29dB', 'SF-EAR-29', 'pcs', 300, 80, '6815200123456'],
    ['Earplug Corded NRR 32dB', 'SF-ERP-32', 'pair', 2000, 500, '6815201234567'],
    ['Dust Mask N95 FFP2', 'SF-MSK-N95', 'pcs', 5000, 1000, '6307202345678'],
    ['Half Face Respirator 6200', 'SF-RSP-HF', 'pcs', 200, 50, '6307203456789'],
    ['Full Face Respirator 6800', 'SF-RSP-FF', 'pcs', 50, 15, '6307204567890'],
    ['Safety Harness Full Body EN361', 'SF-HAR-FB', 'pcs', 100, 30, '6307205678901'],
    ['Lanyard with Energy Absorber 2m', 'SF-LAN-2M', 'pcs', 100, 30, '6307206789012'],
    ['Self-Retracting Lifeline 6m', 'SF-SRL-6M', 'pcs', 50, 15, '6307207890123'],
    ['High-Vis Vest Class 2', 'SF-VIS-C2', 'pcs', 500, 100, '6203908901234'],
    ['High-Vis Jacket Type R3', 'SF-VJK-R3', 'pcs', 200, 50, '6203909012345'],
    ['Fire Extinguisher ABC 5kg', 'SF-FEX-5A', 'pcs', 100, 20, '8424200123456'],
    ['Fire Blanket 1.2x1.2m', 'SF-FBL-12', 'pcs', 50, 10, '6307301234567'],
    ['First Aid Box Large ISO', 'SF-FAB-LG', 'pcs', 50, 10, '9018402345678'],
    ['Safety Net 2mx10m Poly', 'SF-NET-2M', 'roll', 50, 10, '5608503456789'],
    ['Anti-Slip Mat 1mx5m', 'SF-ASM-1M', 'roll', 50, 10, '5705004567890'],
    ['Chemical Spill Kit 25L', 'SF-CSK-25', 'kit', 20, 5, '3822005678901'],
    ['Lockout Tagout Set', 'SF-LOT-SET', 'set', 30, 8, '3926106789012'],
    ['Safety Sign Set 10pcs', 'SF-SGN-SET', 'set', 100, 20, '4911207890123'],
  ],

  'Paints & Coatings': [
    ['Primer Red Oxide 20L', 'PT-PRO-RO20', 'L', 500, 100, '3209001234567'],
    ['Primer Grey Epoxy 20L', 'PT-PRE-EP20', 'L', 300, 80, '3209002345678'],
    ['Zinc Phosphate Primer 20L', 'PT-PRZ-20', 'L', 200, 60, '3209003456789'],
    ['Alkyd Enamel Paint White 20L', 'PT-AEW-20', 'L', 500, 150, '3209104567890'],
    ['Alkyd Enamel Paint Black 20L', 'PT-AEB-20', 'L', 300, 100, '3209104567891'],
    ['Synthetic Enamel Yellow 5L', 'PT-SEY-5', 'L', 300, 80, '3209105678901'],
    ['Epoxy Paint 2-part 20L', 'PT-EP2-20', 'L', 200, 60, '3209206789012'],
    ['Polyurethane Paint 2-part 20L', 'PT-PU2-20', 'L', 150, 50, '3209207890123'],
    ['Intumescent Paint 20L', 'PT-INT-20', 'L', 100, 30, '3209308901234'],
    ['Bituminous Paint 20L', 'PT-BIT-20', 'L', 200, 60, '2715009012345'],
    ['Zinc Rich Paint 20L', 'PT-ZRP-20', 'L', 150, 50, '3209100123456'],
    ['Anti-Corrosive Paint 20L', 'PT-ACP-20', 'L', 200, 60, '3209101234567'],
    ['Heat Resistant Paint 500C 1L', 'PT-HRP-1L', 'L', 100, 30, '3209102345678'],
    ['Chalkboard Paint 1L Black', 'PT-CBP-1BL', 'L', 50, 10, '3209203456789'],
    ['Floor Paint Epoxy 4L', 'PT-FPE-4', 'L', 100, 30, '3209204567890'],
    ['Roof Paint Acrylic 20L White', 'PT-RPA-20W', 'L', 200, 60, '3209205678901'],
    ['Texture Paint 25kg White', 'PT-TEX-25', 'kg', 300, 100, '3214106789012'],
    ['Distemper 10kg White', 'PT-DIS-10', 'kg', 500, 150, '3214107890123'],
    ['Exterior Emulsion 20L', 'PT-EXE-20', 'L', 400, 100, '3209008901234'],
    ['Interior Emulsion 20L', 'PT-INE-20', 'L', 500, 150, '3209009012345'],
    ['Solvent Thinner 5L Nitro', 'PT-TNN-5', 'L', 300, 80, '3814110123456'],
    ['Paint Remover 5L', 'PT-REM-5', 'L', 100, 30, '3814111234567'],
    ['Sandpaper Sheet 60 grit', 'PT-SP-060', 'pcs', 2000, 500, '6805012345678'],
    ['Sandpaper Sheet 120 grit', 'PT-SP-120', 'pcs', 2000, 500, '6805012345679'],
    ['Sandpaper Sheet 240 grit', 'PT-SP-240', 'pcs', 1000, 300, '6805013456789'],
    ['Paint Brush 2 inch', 'PT-PBR-2IN', 'pcs', 500, 100, '9603114567890'],
    ['Paint Roller 9 inch with Frame', 'PT-PRO-9', 'pcs', 300, 80, '9603115678901'],
    ['Spray Gun HVLP 600ml', 'PT-SGN-HV', 'pcs', 50, 10, '8424216789012'],
    ['Masking Tape 25mm 50m', 'PT-MST-25', 'roll', 1000, 200, '4823117890123'],
    ['Filler Paste 4kg White', 'PT-FLL-4W', 'kg', 500, 100, '3214218901234'],
  ],

  'Packaging Materials': [
    ['Corrugated Box 12x10x8 inch', 'PK-CB-1210', 'pcs', 5000, 1000, '4819101234567'],
    ['Corrugated Box 18x14x12 inch', 'PK-CB-1814', 'pcs', 5000, 1500, '4819101234568'],
    ['Corrugated Box 24x18x18 inch', 'PK-CB-2418', 'pcs', 3000, 800, '4819101234569'],
    ['Bubble Wrap 50cm x 50m roll', 'PK-BW-50M', 'roll', 500, 100, '3921002345678'],
    ['Foam Sheet 10mm 1mx2m', 'PK-FS-10', 'pcs', 1000, 200, '3921003456789'],
    ['Stretch Film 500mm x 300m', 'PK-SF-300', 'roll', 500, 100, '3920104567890'],
    ['BOPP Tape 48mm x 100m Brown', 'PK-TP-BR48', 'roll', 2000, 400, '3919105678901'],
    ['BOPP Tape 48mm x 100m Clear', 'PK-TP-CL48', 'roll', 2000, 400, '3919105678902'],
    ['Gummed Paper Tape 48mm Brown', 'PK-GT-48', 'roll', 500, 100, '4823206789012'],
    ['Shrink Wrap 45cm 200m roll', 'PK-SW-200', 'roll', 300, 60, '3920207890123'],
    ['Packing Peanuts 14 cu ft bag', 'PK-PP-14CF', 'bag', 200, 40, '3921308901234'],
    ['Air Pillow 20x30cm pack', 'PK-AP-20X30', 'pack', 300, 60, '3921309012345'],
    ['Jiffy Bag 200x260mm', 'PK-JB-200', 'pcs', 2000, 400, '4819400123456'],
    ['Thermal Carton Liner 600x450', 'PK-TCL-600', 'pcs', 500, 100, '4821001234567'],
    ['Pallet 1200x800mm Euro', 'PK-PLT-EUR', 'pcs', 200, 50, '4415002345678'],
    ['Strapping Band 12mm x 1000m', 'PK-STR-12', 'roll', 200, 40, '3917103456789'],
    ['Strapping Buckle 12mm', 'PK-SBK-12', 'pcs', 5000, 1000, '7326104567890'],
    ['Edge Protector 50x50mm 1m', 'PK-EP-50', 'pcs', 2000, 400, '4823105678901'],
    ['Warning Label Red 100x100mm', 'PK-WL-RED', 'pcs', 3000, 500, '4911206789012'],
    ['Silica Gel Sachet 1g', 'PK-SG-1G', 'pcs', 10000, 2000, '2811307890123'],
    ['Desiccant 100g Clay Bag', 'PK-DSC-100', 'pcs', 3000, 600, '2811308901234'],
    ['VCI Poly Bag 300x400mm', 'PK-VCI-300', 'pcs', 2000, 400, '3923309012345'],
    ['Anti-Static Bag 300x400mm', 'PK-ASB-300', 'pcs', 1000, 200, '3923300123456'],
    ['Security Seal Numbered', 'PK-SSL-NUM', 'pcs', 5000, 1000, '3926401234567'],
    ['Hazardous Goods Label Set', 'PK-HZL-SET', 'pcs', 1000, 200, '4911202345678'],
  ],

  'Lubricants & Chemicals': [
    ['Engine Oil SAE 40 20L', 'LB-EO-40-20', 'L', 500, 100, '2710191234567'],
    ['Hydraulic Oil HLP 46 20L', 'LB-HO-46-20', 'L', 300, 80, '2710192345678'],
    ['Gear Oil EP 90 20L', 'LB-GO-90-20', 'L', 200, 60, '2710193456789'],
    ['Grease Lithium NLGI-2 15kg', 'LB-GR-LI2-15', 'kg', 200, 60, '2710294567890'],
    ['Grease Calcium NLGI-3 5kg', 'LB-GR-CA3-5', 'kg', 100, 30, '2710295678901'],
    ['Cutting Oil Soluble 20L', 'LB-CO-SOL-20', 'L', 200, 60, '3403196789012'],
    ['Releasing Agent 400ml Spray', 'LB-RA-400S', 'pcs', 500, 100, '3403197890123'],
    ['Penetrating Oil WD 400ml', 'LB-PO-400', 'pcs', 300, 80, '3403198901234'],
    ['Chain Lubricant 500ml', 'LB-CL-500', 'pcs', 200, 60, '3403199012345'],
    ['Brake Cleaner 500ml', 'LB-BC-500', 'pcs', 200, 60, '3820100123456'],
    ['Degreaser IPA 5L', 'LB-DG-IPA5', 'L', 100, 30, '3820101234567'],
    ['Acetone Technical Grade 5L', 'LB-ACE-5L', 'L', 100, 30, '2914102345678'],
    ['Isopropyl Alcohol 99% 5L', 'LB-IPA-99-5', 'L', 100, 30, '2905303456789'],
    ['Epoxy Resin 2-part 1kg', 'LB-EPR-1KG', 'kg', 200, 50, '3907204567890'],
    ['Polyurethane Adhesive 500ml', 'LB-PUA-500', 'pcs', 150, 40, '3506205678901'],
    ['Silicone Sealant 300ml Neutral', 'LB-SIL-300N', 'pcs', 500, 100, '3910006789012'],
    ['Silicone Sealant 300ml Acid', 'LB-SIL-300A', 'pcs', 300, 80, '3910007890123'],
    ['Sealant MS Polymer Grey 600ml', 'LB-MS-600G', 'pcs', 200, 60, '3910008901234'],
    ['Flux Powder Brazing 500g', 'LB-FLX-500', 'kg', 100, 30, '2811409012345'],
    ['Rust Converter 500ml', 'LB-RC-500', 'pcs', 200, 50, '2842000123456'],
    ['Anti-Seize Compound 1kg', 'LB-ASZ-1KG', 'kg', 100, 30, '3403101234567'],
    ['Heat Transfer Compound 100g', 'LB-HTC-100', 'pcs', 100, 30, '3403102345678'],
    ['Battery Acid 35% 5L', 'LB-BAC-5L', 'L', 50, 15, '2807003456789'],
    ['Distilled Water 5L', 'LB-DW-5L', 'L', 200, 60, '2801104567890'],
    ['Hydrochloric Acid 33% 30L', 'LB-HCL-30L', 'L', 100, 30, '2806205678901'],
  ],

  'Welding & Cutting': [
    ['MMA Electrode E6013 3.15mm 20kg', 'WL-MMA-315', 'kg', 1000, 200, '8311101234567'],
    ['MMA Electrode E7018 3.15mm 20kg', 'WL-MMA-718', 'kg', 500, 100, '8311102345678'],
    ['MIG Wire ER70S-6 0.8mm 15kg', 'WL-MIG-08-15', 'kg', 500, 100, '8311103456789'],
    ['MIG Wire ER70S-6 1.0mm 15kg', 'WL-MIG-10-15', 'kg', 500, 120, '8311103456790'],
    ['TIG Filler Rod ER316L 2.4mm', 'WL-TIG-316', 'kg', 100, 30, '8311104567890'],
    ['TIG Filler Rod ER308L 1.6mm', 'WL-TIG-308', 'kg', 100, 30, '8311105678901'],
    ['MIG Flux Core Wire E71T-1 1.2mm', 'WL-MFC-12', 'kg', 200, 60, '8311106789012'],
    ['CO2 Gas Cylinder 20kg', 'WL-CO2-20', 'pcs', 50, 15, '7311307890123'],
    ['Argon Gas Cylinder 40L', 'WL-ARG-40', 'pcs', 30, 10, '7311308901234'],
    ['Argon CO2 Mix 75/25 40L', 'WL-MIX-40', 'pcs', 30, 10, '7311309012345'],
    ['Oxygen Cylinder 50L', 'WL-OXY-50', 'pcs', 20, 6, '7311300123456'],
    ['Acetylene Cylinder 6.5m3', 'WL-ACE-65', 'pcs', 20, 6, '7311301234567'],
    ['Plasma Cutter Consumable 60A', 'WL-PCC-60', 'set', 100, 20, '8515802345678'],
    ['Welding Electrode Holder 300A', 'WL-EHD-300', 'pcs', 50, 10, '8311203456789'],
    ['Earth Clamp 400A', 'WL-ECL-400', 'pcs', 50, 10, '8311204567890'],
    ['Welding Cable 16mm 10m', 'WL-WCB-16', 'pcs', 50, 10, '8544415678901'],
    ['MIG Torch MB15 4m', 'WL-MBT-15', 'pcs', 30, 8, '8515806789012'],
    ['TIG Torch WP17 4m Air', 'WL-TGT-17', 'pcs', 20, 5, '8515807890123'],
    ['Oxy-Acetylene Cutting Nozzle 2', 'WL-OCN-2', 'pcs', 100, 20, '8516008901234'],
    ['Welding Blanket 1.8x1.8m Glass', 'WL-WBL-18', 'pcs', 50, 10, '6307209012345'],
    ['Back Purge Dam Silicon 1m', 'WL-BPD-1M', 'm', 50, 10, '3910200123456'],
    ['Anti-Spatter Spray 400ml', 'WL-ASP-400', 'pcs', 300, 60, '3403201234567'],
    ['Cobalt Drill Bit 6mm', 'WL-CDB-6', 'pcs', 200, 50, '8207202345678'],
    ['Hole Saw Bi-metal 50mm', 'WL-HSW-50', 'pcs', 100, 20, '8202303456789'],
    ['Angle Grinder 115mm 850W', 'WL-AGR-115', 'pcs', 30, 8, '8467214567890'],
  ],

  'Office & Stationery': [
    ['A4 Paper 75gsm 500 sheets Ream', 'OF-A4P-75', 'ream', 2000, 400, '4802561234567'],
    ['A4 Paper 80gsm 500 sheets Ream', 'OF-A4P-80', 'ream', 2000, 500, '4802562345678'],
    ['A3 Paper 80gsm 500 sheets Ream', 'OF-A3P-80', 'ream', 500, 100, '4802563456789'],
    ['Ballpoint Pen Blue Box 50', 'OF-BPB-50', 'box', 300, 50, '9608101234567'],
    ['Ballpoint Pen Black Box 50', 'OF-BPK-50', 'box', 200, 40, '9608102345678'],
    ['Permanent Marker Black Box 12', 'OF-PMK-12', 'box', 200, 40, '9608203456789'],
    ['Whiteboard Marker Blue Box 12', 'OF-WMK-12', 'box', 200, 40, '9608304567890'],
    ['Highlighter Set 5 colours', 'OF-HLT-5C', 'set', 200, 50, '9608405678901'],
    ['Stapler Heavy Duty 24/6', 'OF-STG-HD', 'pcs', 100, 20, '8305006789012'],
    ['Staples 24/6 Box 1000', 'OF-STP-24', 'box', 500, 100, '8305107890123'],
    ['Sellotape 24mm x 33m', 'OF-STP-24M', 'roll', 500, 100, '4823208901234'],
    ['Scotch Tape Dispenser + 3 rolls', 'OF-TDP-3R', 'pcs', 100, 20, '4823309012345'],
    ['File Binder A4 Lever Arch', 'OF-FBD-LA', 'pcs', 500, 100, '4820300123456'],
    ['Suspension File A4 Pack 50', 'OF-SPF-50', 'pack', 100, 20, '4820401234567'],
    ['Plastic Folder A4 Clear', 'OF-PLF-A4', 'pcs', 1000, 200, '4820502345678'],
    ['Notebook A5 80 pages Hardcover', 'OF-NTB-A5', 'pcs', 500, 100, '4820603456789'],
    ['Sticky Notes 75x75 100-sheet', 'OF-STN-75', 'pcs', 1000, 200, '4820704567890'],
    ['Calculator Scientific 12-digit', 'OF-CAL-12', 'pcs', 100, 20, '8470205678901'],
    ['Whiteboard 120x90cm Magnetic', 'OF-WBD-120', 'pcs', 30, 6, '3699106789012'],
    ['Printer Ink Cartridge Black HP', 'OF-INK-BHP', 'pcs', 200, 40, '8473207890123'],
    ['Toner Cartridge Black HP LaserJet', 'OF-TNR-BHP', 'pcs', 100, 20, '8473308901234'],
    ['Rubber Band 100g assorted', 'OF-RBD-100', 'pack', 200, 50, '4016309012345'],
    ['Paper Clip 33mm Box 100', 'OF-PCP-33', 'box', 300, 60, '8305400123456'],
    ['Binder Clip 32mm Box 12', 'OF-BCP-32', 'box', 200, 40, '8305501234567'],
    ['Correction Fluid 20ml Brush', 'OF-CFL-20', 'pcs', 200, 50, '9612002345678'],
  ],

  'IT & Networking': [
    ['Network Cable Cat6 305m box', 'IT-CAT6-305', 'box', 100, 20, '8544429012345'],
    ['Network Cable Cat6A 305m box', 'IT-C6A-305', 'box', 50, 10, '8544420123456'],
    ['RJ45 Connector Cat6 100-pack', 'IT-RJ45-100', 'pack', 500, 100, '8536691234567'],
    ['RJ45 Keystone Jack Cat6', 'IT-KSJ-C6', 'pcs', 1000, 200, '8536692345678'],
    ['Patch Panel 24-port Cat6 1U', 'IT-PP-24C6', 'pcs', 30, 6, '8536693456789'],
    ['Network Switch 24-port GbE', 'IT-NSW-24G', 'pcs', 20, 4, '8517624567890'],
    ['Network Switch 48-port GbE', 'IT-NSW-48G', 'pcs', 10, 2, '8517625678901'],
    ['PoE Switch 8-port 120W', 'IT-POE-8P', 'pcs', 30, 6, '8517626789012'],
    ['WiFi Access Point AC1200', 'IT-WAP-AC1', 'pcs', 50, 10, '8517627890123'],
    ['Server Rack 22U 600x1000', 'IT-SRK-22', 'pcs', 10, 2, '8473908901234'],
    ['UPS Rack Mount 2KVA', 'IT-UPS-2KR', 'pcs', 10, 2, '8504409012345'],
    ['PDU Rack Mount 16A 8-outlet', 'IT-PDU-8', 'pcs', 20, 4, '8536600123456'],
    ['Fibre Patch Cable SC-SC 3m', 'IT-FPC-3M', 'pcs', 200, 40, '8544431234567'],
    ['Fibre Patch Cable LC-LC 5m', 'IT-FPC-5M', 'pcs', 200, 40, '8544432345678'],
    ['SFP Module 1G Multimode', 'IT-SFP-1GM', 'pcs', 50, 10, '8517603456789'],
    ['Media Converter 100M SM', 'IT-MCV-100', 'pcs', 30, 6, '8517604567890'],
    ['Cable Label Printer TZ Tape', 'IT-LBP-TZ', 'pcs', 20, 4, '8443305678901'],
    ['TZ Label Tape 12mm Black/White', 'IT-TZT-12', 'pcs', 200, 40, '4821706789012'],
    ['Velcro Cable Tie 25cm Pack 50', 'IT-VCT-25', 'pack', 200, 40, '6309007890123'],
    ['Cable Management Duct 25x25mm', 'IT-CMD-25', 'm', 500, 100, '3917208901234'],
    ['Wall Mount Box 8-port Cat6', 'IT-WMB-8', 'pcs', 50, 10, '8473909012345'],
    ['IP Camera POE 4MP Dome', 'IT-IPC-4D', 'pcs', 50, 10, '8525809012345'],
    ['NVR 16-channel 4K', 'IT-NVR-16', 'pcs', 10, 2, '8521910123456'],
    ['Biometric Access Controller', 'IT-BAC-STD', 'pcs', 20, 4, '8543201234567'],
    ['Intercom Video Door Phone', 'IT-VDP-STD', 'pcs', 30, 6, '8517652345678'],
  ],

  'HVAC & Refrigeration': [
    ['Split AC 1.5 Ton 5 Star Inverter', 'HV-SAC-15I', 'pcs', 20, 8, '8415101234567'],
    ['Split AC 2 Ton 3 Star Inverter', 'HV-SAC-20I', 'pcs', 15, 5, '8415102345678'],
    ['Cassette AC 2 Ton 4-way', 'HV-CAC-20', 'pcs', 10, 3, '8415103456789'],
    ['Duct AC Unit 5 Ton', 'HV-DAC-50', 'pcs', 5, 2, '8415104567890'],
    ['FCU Fan Coil Unit 600 CFM', 'HV-FCU-600', 'pcs', 20, 6, '8415207890123'],
    ['Refrigerant Gas R410A 11.3kg', 'HV-REF-410', 'pcs', 50, 10, '2903309012345'],
    ['Refrigerant Gas R32 9.5kg', 'HV-REF-R32', 'pcs', 50, 10, '2903300123456'],
    ['Copper AC Pipe 1/4 inch 15m', 'HV-ACP-14', 'set', 200, 40, '7411301234567'],
    ['AC Drain Pipe 16mm 50m', 'HV-ADP-16', 'roll', 200, 50, '3917303456789'],
    ['Refrigeration Manifold Gauge Set', 'HV-MGS-STD', 'set', 20, 5, '9025904567890'],
    ['Vacuum Pump 5 CFM Dual Stage', 'HV-VCP-5', 'pcs', 10, 3, '8414205678901'],
    ['Flaring Tool Set 1/4-3/4 inch', 'HV-FLT-SET', 'set', 20, 5, '8466206789012'],
    ['AC Remote Universal', 'HV-ACR-UNV', 'pcs', 100, 20, '8543207890123'],
    ['Thermostat Digital Programmable', 'HV-TRM-DPG', 'pcs', 100, 30, '9032308901234'],
    ['Humidifier Industrial 10L/hr', 'HV-HMD-10', 'pcs', 20, 5, '8479409012345'],
    ['Dehumidifier 30L/day', 'HV-DHD-30', 'pcs', 15, 4, '8415400123456'],
    ['Air Curtain 1200mm 2-speed', 'HV-ACU-120', 'pcs', 30, 8, '8414501234567'],
    ['Evaporative Cooler 75L', 'HV-EVC-75', 'pcs', 30, 8, '8415602345678'],
    ['Industrial Pedestal Fan 24 inch', 'HV-IPF-24', 'pcs', 50, 15, '8414704567890'],
    ['Axial Flow Fan 500mm', 'HV-AXF-500', 'pcs', 30, 8, '8414805678901'],
    ['Centrifugal Blower 1000 CFM', 'HV-CBL-1K', 'pcs', 15, 5, '8414806789012'],
    ['Flexible Duct 250mm 5m', 'HV-FDT-250', 'pcs', 100, 20, '3917207890123'],
    ['GI Duct Sheet 0.8mm 2400x1200', 'HV-GDS-08', 'pcs', 100, 30, '7326008901234'],
    ['Fire Damper 300x300mm', 'HV-FDM-300', 'pcs', 50, 10, '8481400123456'],
    ['Cooling Tower FRP 20 TR', 'HV-CTW-20T', 'pcs', 5, 2, '8418308901234'],
  ],

  'Cleaning & Janitorial': [
    ['Floor Cleaner Disinfectant 5L', 'CL-FLC-5L', 'L', 500, 100, '3402101234567'],
    ['Glass Cleaner Concentrate 5L', 'CL-GLC-5L', 'L', 300, 60, '3402102345678'],
    ['Toilet Bowl Cleaner 5L', 'CL-TBC-5L', 'L', 300, 60, '3402103456789'],
    ['Industrial Degreaser 5L', 'CL-IDG-5L', 'L', 200, 40, '3402204567890'],
    ['Hand Wash Liquid 5L Refill', 'CL-HWL-5L', 'L', 500, 100, '3401105678901'],
    ['Dishwash Liquid 5L Lemon', 'CL-DWL-5L', 'L', 300, 60, '3401106789012'],
    ['Air Freshener Spray 400ml', 'CL-AFS-400', 'pcs', 500, 100, '3307207890123'],
    ['Phenyl White Concentrated 5L', 'CL-PHN-5L', 'L', 300, 60, '3808208901234'],
    ['Bleach Sodium Hypochlorite 5L', 'CL-BLC-5L', 'L', 300, 60, '2828309012345'],
    ['Mop Bucket with Wringer 15L', 'CL-MBK-15', 'pcs', 50, 10, '7323400123456'],
    ['Mop Refill Cotton 400g', 'CL-MRF-400', 'pcs', 200, 40, '9603001234567'],
    ['Microfibre Mop Head 60cm', 'CL-MMH-60', 'pcs', 100, 20, '9603102345678'],
    ['Broom Soft 12 inch', 'CL-BRM-12', 'pcs', 100, 20, '9603203456789'],
    ['Dustpan Set with Broom', 'CL-DPS-SET', 'set', 100, 20, '9603304567890'],
    ['Scrubbing Brush Hand 9 inch', 'CL-SBH-9', 'pcs', 200, 40, '9603405678901'],
    ['Scouring Pad Heavy Duty Pack 10', 'CL-SCP-10', 'pack', 300, 60, '3602106789012'],
    ['Garbage Bag 100L Black Pack 25', 'CL-GBG-100', 'pack', 500, 100, '3923207890123'],
    ['Garbage Bag 60L Black Pack 50', 'CL-GBG-60', 'pack', 500, 100, '3923208901234'],
    ['Tissue Roll 2-ply Pack 12', 'CL-TRL-12', 'pack', 1000, 200, '4818309012345'],
    ['Paper Towel Industrial 150m', 'CL-PTW-150', 'roll', 300, 60, '4818400123456'],
    ['Wet Wipes Industrial 80-sheet', 'CL-WWP-80', 'pcs', 500, 100, '3307501234567'],
    ['Industrial Vacuum Cleaner 30L', 'CL-IVC-30', 'pcs', 10, 2, '8508202345678'],
    ['High Pressure Washer 150 bar', 'CL-HPW-150', 'pcs', 10, 2, '8424103456789'],
    ['Soap Dispenser 1L Wall Mount', 'CL-SDS-1L', 'pcs', 50, 10, '3924906789012'],
    ['Hand Dryer Electric Warm Air', 'CL-HDR-WA', 'pcs', 20, 4, '8516705678901'],
  ],

  'Medical & Lab': [
    ['Latex Exam Gloves M Box 100', 'MD-LXG-M', 'box', 500, 100, '4015111234567'],
    ['Nitrile Exam Gloves L Box 100', 'MD-NXG-L', 'box', 500, 100, '4015112345678'],
    ['Surgical Mask 3-ply Box 50', 'MD-MSK-3P', 'box', 1000, 200, '6307213456789'],
    ['KN95 Mask FFP2 Box 25', 'MD-KN95-25', 'box', 500, 100, '6307214567890'],
    ['Hand Sanitizer 500ml 70% IPA', 'MD-HSN-500', 'pcs', 1000, 200, '3808015678901'],
    ['IPA Wipes Box 100', 'MD-IPW-100', 'box', 500, 100, '3808016789012'],
    ['Digital Infrared Thermometer', 'MD-DTH-IR', 'pcs', 100, 20, '9025907890123'],
    ['Blood Pressure Monitor Digital', 'MD-BPM-DG', 'pcs', 30, 6, '9018108901234'],
    ['Pulse Oximeter Fingertip', 'MD-POX-FT', 'pcs', 50, 10, '9018209012345'],
    ['First Aid Bandage 10cm x 4.5m', 'MD-FAB-10', 'pcs', 500, 100, '3005300123456'],
    ['Gauze Swab 10x10cm Pack 100', 'MD-GSW-100', 'pack', 300, 60, '3005401234567'],
    ['Cotton Roll Absorbent 500g', 'MD-CTN-500', 'pcs', 300, 60, '5601502345678'],
    ['Micropore Tape 2.5cm x 9.1m', 'MD-MPT-25', 'roll', 500, 100, '3005603456789'],
    ['Antiseptic Solution 500ml', 'MD-ANS-500', 'pcs', 200, 40, '3003007890123'],
    ['Hydrogen Peroxide 3% 500ml', 'MD-H2O-500', 'pcs', 200, 40, '2847508901234'],
    ['Eye Wash Solution 500ml', 'MD-EWS-500', 'pcs', 100, 20, '3005809012345'],
    ['Burn Gel Sachet Box 25', 'MD-BRN-GEL', 'box', 100, 20, '3004900123456'],
    ['Stretcher Folding Aluminium', 'MD-STR-ALU', 'pcs', 10, 2, '9021902345678'],
    ['Stethoscope Dual Head', 'MD-STH-DH', 'pcs', 30, 6, '9018104567890'],
    ['Autoclave 23L Benchtop', 'MD-AUC-23', 'pcs', 5, 1, '8419105678901'],
    ['pH Meter Digital Bench', 'MD-PHM-DG', 'pcs', 10, 3, '9027307890123'],
    ['Analytical Balance 0.0001g', 'MD-ABL-01', 'pcs', 5, 1, '9016408901234'],
    ['Petri Dish Glass 90mm Box 10', 'MD-PDG-90', 'box', 100, 20, '7017600123456'],
    ['Lab Coat White Size L', 'MD-LBC-L', 'pcs', 100, 20, '6211001234567'],
    ['Safety Data Sheet Binder A4', 'MD-SDS-A4', 'pcs', 50, 10, '4820602345678'],
  ],


  'Furniture & Fixtures': [
    ['Office Chair Ergonomic Mesh', 'FF-OCH-ERG', 'pcs', 50, 10, '9401901234567'],
    ['Office Chair Basic Fixed Arm', 'FF-OCH-BSC', 'pcs', 100, 20, '9401902345678'],
    ['Visitor Chair Plastic Stacking', 'FF-VCH-STK', 'pcs', 200, 40, '9401903456789'],
    ['Conference Chair PU Leather', 'FF-CCH-PU', 'pcs', 50, 10, '9401904567890'],
    ['Workstation Desk L-Shape', 'FF-WSD-LSH', 'pcs', 20, 4, '9403505678901'],
    ['Workstation Desk Straight 1200', 'FF-WSD-120', 'pcs', 50, 10, '9403506789012'],
    ['Computer Table with Keyboard Tray', 'FF-CTB-KT', 'pcs', 30, 6, '9403507890123'],
    ['Conference Table 3600x1200', 'FF-CNF-360', 'pcs', 5, 1, '9403508901234'],
    ['Steel Almirah 2-door', 'FF-ALM-2D', 'pcs', 30, 6, '9403609012345'],
    ['File Cabinet 4-drawer Steel', 'FF-FCB-4D', 'pcs', 30, 6, '9403600123456'],
    ['Locker 12-compartment Steel', 'FF-LCK-12', 'pcs', 10, 2, '9403701234567'],
    ['Bookshelf 5-tier Metal', 'FF-BSH-5T', 'pcs', 20, 4, '9403702345678'],
    ['Reception Desk L-Shape', 'FF-RCP-LSH', 'pcs', 5, 1, '9403803456789'],
    ['Notice Board 1200x900 Cork', 'FF-NBD-CRK', 'pcs', 30, 6, '3699804567890'],
    ['Steel Rack Heavy Duty 5-tier', 'FF-SRK-5T', 'pcs', 50, 10, '9403905678901'],
    ['Pallet Rack Selective 4m', 'FF-PRK-SEL', 'set', 20, 4, '9403906789012'],
    ['Mobile Shelving Trolley', 'FF-MST-STD', 'pcs', 20, 5, '8716207890123'],
    ['Step Stool 2-step Steel', 'FF-SST-2S', 'pcs', 30, 6, '7323008901234'],
    ['Platform Trolley 800x500', 'FF-PTR-800', 'pcs', 20, 5, '8716309012345'],
    ['Hand Truck L-back 250kg', 'FF-HTS-250', 'pcs', 20, 5, '8716400123456'],
    ['Pallet Jack Manual 2T', 'FF-PAJ-2T', 'pcs', 10, 3, '8427601234567'],
    ['Forklift Electric 1.5T', 'FF-FLK-15', 'pcs', 3, 1, '8427702345678'],
    ['Safety Cabinet Flammable 45G', 'FF-SCB-45G', 'pcs', 5, 1, '7326103456789'],
    ['Modular Partition Panel 1200x1500', 'FF-MPP-120', 'pcs', 20, 5, '9401804567890'],
    ['Raised Floor Panel 600x600', 'FF-RFP-600', 'pcs', 200, 40, '3918705678901'],
  ],

  'Tiles & Flooring': [
    ['Vitrified Tile 600x600 White Matt', 'TL-VTW-600', 'sqm', 2000, 500, '6907101234567'],
    ['Vitrified Tile 600x600 Beige Polish', 'TL-VTB-600', 'sqm', 2000, 500, '6907102345678'],
    ['Vitrified Tile 800x800 Grey Matt', 'TL-VTG-800', 'sqm', 1000, 300, '6907103456789'],
    ['Ceramic Wall Tile 300x600 White', 'TL-CWW-306', 'sqm', 1500, 400, '6907204567890'],
    ['Ceramic Floor Tile 400x400 Ivory', 'TL-CFI-400', 'sqm', 1500, 400, '6907205678901'],
    ['Anti-Skid Tile 300x300 Grey', 'TL-AST-300', 'sqm', 1000, 300, '6907306789012'],
    ['Parking Tile 600x600 Red', 'TL-PKR-600', 'sqm', 1000, 300, '6907307890123'],
    ['Marble Botticino 600x600 Honed', 'TL-MRB-600', 'sqm', 500, 150, '6802108901234'],
    ['Granite Black Galaxy 600x600', 'TL-GRN-600', 'sqm', 500, 150, '6802209012345'],
    ['Travertine Tile 600x600 Filled', 'TL-TRV-600', 'sqm', 300, 80, '6802300123456'],
    ['WPC Flooring 5mm 180x1220', 'TL-WPC-5MM', 'sqm', 500, 100, '4418001234567'],
    ['Laminate Flooring 8mm AC4', 'TL-LMN-8MM', 'sqm', 500, 100, '4418102345678'],
    ['Vinyl Plank Flooring 4mm', 'TL-VNL-4MM', 'sqm', 1000, 200, '3918203456789'],
    ['Epoxy Flooring Kit 5kg Grey', 'TL-EPX-5KG', 'set', 100, 20, '3209304567890'],
    ['PU Flooring System 5kg', 'TL-PUF-5KG', 'set', 50, 10, '3209405678901'],
    ['Rubber Mat Antifatigue 900x600', 'TL-RMT-900', 'pcs', 200, 40, '4016506789012'],
    ['Rubber Flooring Roll 6mm 1.2mx5m', 'TL-RFR-6MM', 'roll', 100, 20, '4016607890123'],
    ['Carpet Tile 500x500 Commercial', 'TL-CPT-500', 'pcs', 1000, 200, '5705108901234'],
    ['Carpet Roll Broadloom 4m wide', 'TL-CPR-4M', 'roll', 50, 10, '5705209012345'],
    ['Floor Skirting PVC 60mm 2.5m', 'TL-SKT-PVC', 'pcs', 1000, 200, '3916300123456'],
    ['T-Moulding Trim 35mm 2.5m', 'TL-TMS-35', 'pcs', 500, 100, '3916401234567'],
    ['Subfloor Underlay 3mm 15sqm', 'TL-SFU-3MM', 'roll', 200, 40, '3921502345678'],
    ['Tile Spacer 3mm Box 100', 'TL-SPC-3MM', 'box', 2000, 400, '3925603456789'],
    ['Grout Float Rubber', 'TL-GRF-RUB', 'pcs', 100, 20, '9603704567890'],
    ['Tile Cutter Manual 800mm', 'TL-TCT-800', 'pcs', 20, 4, '8462305678901'],
  ],



  'Generators & Power': [
    ['Generator 25KVA Diesel Open', 'GP-GEN-25O', 'pcs', 5, 1, '8502101234567'],
    ['Generator 62.5KVA Silent', 'GP-GEN-625', 'pcs', 3, 1, '8502102345678'],
    ['Generator 125KVA Soundproof', 'GP-GEN-125', 'pcs', 2, 1, '8502103456789'],
    ['Portable Generator 7.5KVA', 'GP-GEN-75P', 'pcs', 10, 2, '8502204567890'],
    ['ATS Panel 100A Auto Transfer', 'GP-ATS-100', 'pcs', 10, 3, '8537305678901'],
    ['Solar Inverter 5KW Hybrid', 'GP-SIV-5K', 'pcs', 20, 5, '8504406789012'],
    ['Solar Battery 200Ah 12V Gel', 'GP-SBT-200', 'pcs', 50, 10, '8507207890123'],
    ['Solar Panel 440W Mono PERC', 'GP-SPL-440', 'pcs', 100, 20, '8541408901234'],
    ['Solar Structure GI 2-panel', 'GP-STR-2P', 'set', 50, 10, '7308509012345'],
    ['Battery Charger 24V 30A', 'GP-BCH-24V', 'pcs', 20, 5, '8504400123456'],
    ['DC-DC Converter 24V-12V 30A', 'GP-DCX-30A', 'pcs', 20, 5, '8504501234567'],
    ['Cable 35mm2 Welding Red 10m', 'GP-WCB-35R', 'pcs', 50, 10, '8544402345678'],
    ['Earthing Rod Copper Bonded 3m', 'GP-ERD-3M', 'pcs', 50, 10, '7614503456789'],
    ['Lightning Arrester 10kA', 'GP-LTA-10K', 'pcs', 20, 5, '8535904567890'],
    ['Busbar Copper 25x3mm 1m', 'GP-BBR-25X3', 'm', 200, 40, '7407005678901'],
    ['MCB Box Surface Mount 4-way', 'GP-MCB-4W', 'pcs', 100, 20, '8535906789012'],
    ['Isolator 4-pole 125A', 'GP-ISO-125', 'pcs', 30, 8, '8536207890123'],
    ['Surge Protector DIN 40kA', 'GP-SPD-40K', 'pcs', 50, 10, '8535908901234'],
  ],


};

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  const shouldClear = process.argv.includes('--clear');
  if (shouldClear) {
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}), Warehouse.deleteMany({}), Product.deleteMany({}),
      Stock.deleteMany({}), Receipt.deleteMany({}), Delivery.deleteMany({}),
      Transfer.deleteMany({}), Adjustment.deleteMany({}), StockLedger.deleteMany({}),
    ]);
    console.log('Cleared.');
  }

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const mgr = await User.create({
    name: 'Rajesh Sharma', email: 'manager@coreinventory.com',
    password: await bcrypt.hash('Manager@123', 12), role: 'manager',
  });
  const staff = await User.create({
    name: 'Priya Patel', email: 'staff@coreinventory.com',
    password: await bcrypt.hash('Staff@123', 12), role: 'staff',
  });
  console.log('✅ Users: manager@coreinventory.com / Manager@123');

  // ── 2. WAREHOUSES ─────────────────────────────────────────────────────────
  console.log('Creating warehouses...');
  const warehouses = await Warehouse.insertMany(WAREHOUSES);
  const [mainWH, secWH, prodWH, coldWH, returnWH] = warehouses;
  console.log(`✅ Warehouses: ${warehouses.length}`);

  // ── 3. PRODUCTS ───────────────────────────────────────────────────────────
  console.log('Creating products...');
  const allProductDocs = [];
  for (const [category, items] of Object.entries(PRODUCT_DATA)) {
    for (const [name, sku, unit, reorderLevel, initialQty, barcode] of items) {
      allProductDocs.push({ name, sku, category, unit, reorderLevel, barcode, description: `${name} — ${category} item` });
    }
  }
  const products = await Product.insertMany(allProductDocs);
  console.log(`✅ Products: ${products.length}`);

  // Build a map: sku → { product, initialQty }
  const productMap = {};
  let pi = 0;
  for (const [category, items] of Object.entries(PRODUCT_DATA)) {
    for (const [name, sku, unit, reorderLevel, initialQty] of items) {
      productMap[sku] = { product: products[pi], initialQty };
      pi++;
    }
  }

  // ── 4. STOCK (initial quantities) ─────────────────────────────────────────
  console.log('Setting initial stock levels...');
  const stockDocs = [];
  const stockBalances = {}; // key: `${productId}_${warehouseId}` => qty

  for (const [sku, { product, initialQty }] of Object.entries(productMap)) {
    // Distribute stock across main + secondary warehouses
    const mainQty = Math.round(initialQty * 0.65);
    const secQty = Math.round(initialQty * 0.25);
    const prodQty = Math.round(initialQty * 0.10);

    stockDocs.push({ product: product._id, warehouse: mainWH._id, quantity: mainQty });
    stockDocs.push({ product: product._id, warehouse: secWH._id, quantity: secQty });
    stockDocs.push({ product: product._id, warehouse: prodWH._id, quantity: prodQty });

    stockBalances[`${product._id}_${mainWH._id}`] = mainQty;
    stockBalances[`${product._id}_${secWH._id}`] = secQty;
    stockBalances[`${product._id}_${prodWH._id}`] = prodQty;
  }
  await Stock.insertMany(stockDocs);
  console.log(`✅ Stock records: ${stockDocs.length}`);

  // ── 5. RECEIPTS ───────────────────────────────────────────────────────────
  console.log('Creating receipts...');
  const productList = products;
  const receiptStatuses = ['Done', 'Done', 'Done', 'Done', 'Done', 'Ready', 'Waiting', 'Draft'];
  const ledgerDocs = [];
  const receipts = [];

  for (let i = 1; i <= 80; i++) {
    const status = pick(receiptStatuses);
    const supplier = pick(SUPPLIERS);
    const daysAgo = rand(1, 180);
    const numItems = rand(2, 6);
    const itemProducts = pickN(productList, numItems);
    const items = itemProducts.map(p => {
      const qty = rand(20, 500);
      return { product: p._id, warehouse: pick([mainWH._id, secWH._id]), quantity: qty, receivedQty: status === 'Done' ? qty : 0 };
    });

    const receipt = {
      ref: pad(i, 'REC'),
      supplier, status, items,
      notes: pick(['', '', `Order #${rand(10000, 99999)}`, `PO Ref: ${rand(1000, 9999)}`, `Contract ref ${rand(100, 999)}`]),
      scheduledDate: date(daysAgo + rand(0, 7)),
      validatedAt: status === 'Done' ? date(daysAgo) : undefined,
      createdBy: pick([mgr._id, staff._id]),
      createdAt: date(daysAgo + 1),
    };
    receipts.push(receipt);

    // Ledger entries for Done receipts
    if (status === 'Done') {
      for (const item of items) {
        const key = `${item.product}_${item.warehouse}`;
        const prev = stockBalances[key] || 0;
        stockBalances[key] = prev + item.quantity;
        ledgerDocs.push({
          product: item.product, warehouse: item.warehouse,
          type: 'RECEIPT', quantity: item.quantity, balanceAfter: stockBalances[key],
          referenceRef: receipt.ref,
          note: `Receipt from ${supplier}`, createdBy: mgr._id,
          createdAt: date(daysAgo),
        });
      }
    }
  }
  await Receipt.insertMany(receipts.map(r => ({ ...r })));
  console.log(`✅ Receipts: 80`);

  // ── 6. DELIVERIES ─────────────────────────────────────────────────────────
  console.log('Creating deliveries...');
  const deliveryStatuses = ['Done', 'Done', 'Done', 'Done', 'Ready', 'Draft', 'Cancelled'];
  const deliveries = [];

  for (let i = 1; i <= 60; i++) {
    const status = pick(deliveryStatuses);
    const customer = pick(CUSTOMERS);
    const daysAgo = rand(1, 150);
    const numItems = rand(1, 5);
    const itemProducts = pickN(productList, numItems);
    const items = itemProducts.map(p => {
      const qty = rand(5, 200);
      return { product: p._id, warehouse: pick([mainWH._id, secWH._id]), quantity: qty, pickedQty: status === 'Done' ? qty : 0 };
    });

    const delivery = {
      ref: pad(i, 'DEL'),
      customer, status, items,
      notes: pick(['', '', `SO #${rand(10000, 99999)}`, `Sales order: ${rand(1000, 9999)}`]),
      scheduledDate: date(daysAgo + rand(0, 5)),
      validatedAt: status === 'Done' ? date(daysAgo) : undefined,
      createdBy: pick([mgr._id, staff._id]),
      createdAt: date(daysAgo + 1),
    };
    deliveries.push(delivery);

    if (status === 'Done') {
      for (const item of items) {
        const key = `${item.product}_${item.warehouse}`;
        const prev = stockBalances[key] || 0;
        const deduct = Math.min(item.quantity, prev);
        stockBalances[key] = Math.max(0, prev - deduct);
        ledgerDocs.push({
          product: item.product, warehouse: item.warehouse,
          type: 'DELIVERY', quantity: -deduct, balanceAfter: stockBalances[key],
          referenceRef: delivery.ref,
          note: `Delivery to ${customer}`, createdBy: mgr._id,
          createdAt: date(daysAgo),
        });
      }
    }
  }
  await Delivery.insertMany(deliveries.map(d => ({ ...d })));
  console.log(`✅ Deliveries: 60`);

  // ── 7. TRANSFERS ──────────────────────────────────────────────────────────
  console.log('Creating transfers...');
  const transferStatuses = ['Done', 'Done', 'Done', 'In Transit', 'Draft'];
  const transferPairs = [
    [mainWH._id, prodWH._id],
    [mainWH._id, secWH._id],
    [secWH._id, prodWH._id],
    [secWH._id, mainWH._id],
    [prodWH._id, returnWH._id],
  ];
  const transfers = [];

  for (let i = 1; i <= 40; i++) {
    const status = pick(transferStatuses);
    const [fromWH, toWH] = pick(transferPairs);
    const p = pick(productList);
    const qty = rand(10, 200);
    const daysAgo = rand(1, 120);

    const transfer = {
      ref: pad(i, 'TRF'),
      product: p._id, fromWarehouse: fromWH, toWarehouse: toWH,
      quantity: qty, status,
      notes: pick(['', `Replenishment run`, `Production order`, `Stock balancing`, `Emergency transfer`]),
      completedAt: status === 'Done' ? date(daysAgo) : undefined,
      createdBy: pick([mgr._id, staff._id]),
      createdAt: date(daysAgo + 1),
    };
    transfers.push(transfer);

    if (status === 'Done') {
      const keyFrom = `${p._id}_${fromWH}`;
      const keyTo = `${p._id}_${toWH}`;
      const fromPrev = stockBalances[keyFrom] || 0;
      const deduct = Math.min(qty, fromPrev);
      stockBalances[keyFrom] = Math.max(0, fromPrev - deduct);
      stockBalances[keyTo] = (stockBalances[keyTo] || 0) + deduct;

      ledgerDocs.push({
        product: p._id, warehouse: fromWH, type: 'TRANSFER_OUT',
        quantity: -deduct, balanceAfter: stockBalances[keyFrom],
        referenceRef: transfer.ref, note: 'Internal transfer out',
        createdBy: mgr._id, createdAt: date(daysAgo),
      });
      ledgerDocs.push({
        product: p._id, warehouse: toWH, type: 'TRANSFER_IN',
        quantity: deduct, balanceAfter: stockBalances[keyTo],
        referenceRef: transfer.ref, note: 'Internal transfer in',
        createdBy: mgr._id, createdAt: date(daysAgo),
      });
    }
  }
  await Transfer.insertMany(transfers.map(t => ({ ...t })));
  console.log(`✅ Transfers: 40`);

  // ── 8. ADJUSTMENTS ────────────────────────────────────────────────────────
  console.log('Creating adjustments...');
  const adjReasons = ['Physical count', 'Damaged goods', 'Theft / Loss', 'Expiry', 'Data correction', 'Found in audit', 'Supplier shortage'];
  const adjustments = [];

  for (let i = 1; i <= 30; i++) {
    const p = pick(productList);
    const wh = pick([mainWH._id, secWH._id]);
    const key = `${p._id}_${wh}`;
    const prev = stockBalances[key] || rand(10, 100);
    const diff = rand(-20, 15);
    const newQty = Math.max(0, prev + diff);
    const daysAgo = rand(1, 90);
    const reason = pick(adjReasons);

    stockBalances[key] = newQty;

    adjustments.push({
      ref: pad(i, 'ADJ'),
      product: p._id, warehouse: wh,
      previousQty: prev, newQty, difference: newQty - prev, reason,
      createdBy: mgr._id,
      createdAt: date(daysAgo),
    });

    ledgerDocs.push({
      product: p._id, warehouse: wh, type: 'ADJUSTMENT',
      quantity: newQty - prev, balanceAfter: newQty,
      referenceRef: pad(i, 'ADJ'), note: reason,
      createdBy: mgr._id, createdAt: date(daysAgo),
    });
  }
  await Adjustment.insertMany(adjustments);
  console.log(`✅ Adjustments: 30`);

  // ── 9. LEDGER ─────────────────────────────────────────────────────────────
  console.log('Creating ledger entries...');
  await StockLedger.insertMany(ledgerDocs);
  console.log(`✅ Ledger entries: ${ledgerDocs.length}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('✅  CoreInventory Database Seeded!');
  console.log('─────────────────────────────────────────');
  console.log(`  Users          : 2`);
  console.log(`  Warehouses     : ${warehouses.length}`);
  console.log(`  Products       : ${products.length}`);
  console.log(`  Stock records  : ${stockDocs.length}`);
  console.log(`  Receipts       : 80`);
  console.log(`  Deliveries     : 60`);
  console.log(`  Transfers      : 40`);
  console.log(`  Adjustments    : 30`);
  console.log(`  Ledger entries : ${ledgerDocs.length}`);
  console.log('─────────────────────────────────────────');
  console.log('\n  LOGIN CREDENTIALS:');
  console.log('  Manager  → manager@coreinventory.com  / Manager@123');
  console.log('  Staff    → staff@coreinventory.com    / Staff@123');
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
