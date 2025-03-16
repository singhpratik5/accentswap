const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db'); // Database connection
const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Connect to Database
connectDB();

// Define Routes
app.use('/api/auth', require('./server/routes/authRoutes')); 
app.use('/api/protected', require('./server/routes/protected'));
app.use('/api/admin', require('./server/routes/adminRoutes'));
// Add matching routes
app.use('/api/matching', require('./server/routes/matchingRoutes'));
// Add feedback routes
app.use('/api/feedback', require('./server/routes/feedbackRoutes'));

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize WebRTC signaling for main app
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('message', (message) => {
    console.log(`Received message: ${message}`);
    // Broadcast the message to all connected clients
    socket.broadcast.emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize testing mode signaling
require('./server/testingSignaling')(io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Socket.IO server running on ws://localhost:${PORT}`);
});