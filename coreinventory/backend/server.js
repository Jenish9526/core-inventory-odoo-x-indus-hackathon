const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/warehouses',  require('./routes/warehouses'));
app.use('/api/receipts',    require('./routes/receipts'));
app.use('/api/deliveries',  require('./routes/deliveries'));
app.use('/api/transfers',   require('./routes/transfers'));
app.use('/api/adjustments', require('./routes/adjustments'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/ledger',      require('./routes/ledger'));
app.use('/api/feedback',    require('./routes/feedback'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coreinventory';

const { startSimulator } = require('./liveSimulator');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      startSimulator(io);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
