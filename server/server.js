const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const dispatchRoutes = require('./routes/dispatchRoutes');
const simulationService = require('./services/simulationService');
const { dbStore } = require('./models/store');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection attempt (gracefully falls back to in-memory store)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/careroute';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('🟢 MongoDB Connected Successfully'))
  .catch((err) => console.log('ℹ️ Running with active In-Memory DB Store (MongoDB not detected on port 27017)'));

// API Routes
app.use('/api', dispatchRoutes(io));

// Simulation Endpoints
app.post('/api/simulation/start', (req, res) => {
  const result = simulationService.startSimulation(io, req.body || {});
  res.json(result);
});

app.post('/api/simulation/stop', (req, res) => {
  simulationService.stopSimulation();
  res.json({ success: true, message: 'Simulation stopped' });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Send initial data to connected client
  socket.emit('store:initial', {
    dispatches: dbStore.dispatches,
    ambulances: dbStore.ambulances,
    patients: dbStore.patients,
    hospitals: dbStore.hospitals
  });

  socket.on('join:room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('simulation:trigger', (options) => {
    simulationService.startSimulation(io, options || {});
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CareRoute AI Server running on http://localhost:${PORT}`);
});
