/**
 * WebRTC Signaling Server for Testing Mode
 * Handles room-based connections for local network testing
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (io) => {
  // Store active rooms
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`Testing mode: User connected with ID ${socket.id}`);

    // Create a new room
    socket.on('create-room', () => {
      const roomId = uuidv4().substring(0, 8); // Generate shorter room ID for easier sharing
      
      // Store room info
      activeRooms.set(roomId, {
        host: socket.id,
        guests: [],
        createdAt: Date.now()
      });
      
      // Join the socket to the room
      socket.join(roomId);
      
      // Notify client that room was created
      socket.emit('room-created', { roomId });
      
      console.log(`Room created: ${roomId} by user ${socket.id}`);
    });

    // Join an existing room
    socket.on('join-room', ({ roomId }) => {
      // Check if room exists
      if (!activeRooms.has(roomId)) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Join the socket to the room
      socket.join(roomId);
      
      // Update room info
      const roomInfo = activeRooms.get(roomId);
      roomInfo.guests.push(socket.id);
      activeRooms.set(roomId, roomInfo);
      
      // Notify client that they joined the room
      socket.emit('room-joined', { roomId });
      
      // Notify host that someone joined
      socket.to(roomId).emit('user-joined', { userId: socket.id });
      
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // Leave a room
    socket.on('leave-room', ({ roomId }) => {
      handleLeaveRoom(socket, roomId);
    });

    // WebRTC signaling: offer
    socket.on('offer', ({ offer, roomId }) => {
      console.log(`Received offer from ${socket.id} in room ${roomId}`);
      socket.to(roomId).emit('offer', { offer, roomId });
    });

    // WebRTC signaling: answer
    socket.on('answer', ({ answer, roomId }) => {
      console.log(`Received answer from ${socket.id} in room ${roomId}`);
      socket.to(roomId).emit('answer', { answer, roomId });
    });

    // WebRTC signaling: ICE candidate
    socket.on('candidate', ({ candidate, roomId }) => {
      socket.to(roomId).emit('candidate', { candidate, roomId });
    });

    // Chat message
    socket.on('chat-message', (message) => {
      const { roomId } = message;
      socket.to(roomId).emit('chat-message', message);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find and leave all rooms this socket was in
      activeRooms.forEach((roomInfo, roomId) => {
        if (roomInfo.host === socket.id || roomInfo.guests.includes(socket.id)) {
          handleLeaveRoom(socket, roomId);
        }
      });
    });
  });

  // Helper function to handle leaving a room
  const handleLeaveRoom = (socket, roomId) => {
    if (!activeRooms.has(roomId)) return;
    
    const roomInfo = activeRooms.get(roomId);
    
    // If host leaves, close the room
    if (roomInfo.host === socket.id) {
      // Notify all users in the room
      socket.to(roomId).emit('user-disconnected');
      
      // Remove the room
      activeRooms.delete(roomId);
      console.log(`Room ${roomId} closed because host left`);
    } else {
      // Remove guest from room
      roomInfo.guests = roomInfo.guests.filter(id => id !== socket.id);
      activeRooms.set(roomId, roomInfo);
      
      // Notify others that user left
      socket.to(roomId).emit('user-left', { userId: socket.id });
      console.log(`User ${socket.id} left room ${roomId}`);
    }
    
    // Leave the socket.io room
    socket.leave(roomId);
  };

  // Periodically clean up inactive rooms (optional)
  setInterval(() => {
    const now = Date.now();
    const roomTimeout = 3600000; // 1 hour in milliseconds
    
    activeRooms.forEach((roomInfo, roomId) => {
      if (now - roomInfo.createdAt > roomTimeout) {
        // Notify all users in the room
        io.to(roomId).emit('room-expired');
        
        // Remove the room
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} expired and was removed`);
      }
    });
  }, 300000); // Check every 5 minutes
};