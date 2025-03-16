import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/video', videoRoutes);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('offer', (data) => socket.broadcast.emit('offer', data));
    socket.on('answer', (data) => socket.broadcast.emit('answer', data));
    socket.on('candidate', (data) => socket.broadcast.emit('candidate', data));
    socket.on('disconnect', () => console.log(`User disconnected: ${socket.id}`));
});

server.listen(5000, () => console.log('Server running on port 5000'));