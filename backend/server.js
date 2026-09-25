require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const socketHandler = require('./socket/socketHandler');

const connectDB = require('./utils/connectDB');
const dbCheck = require('./middleware/dbCheck');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e7,
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static access to uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get(['/api', '/api/health'], (req, res) => res.json({ status: 'ok', name: 'Connectly RTC API', time: new Date().toISOString() }));
app.use('/api/auth', dbCheck, authRoutes);
app.use('/api/rooms', dbCheck, roomRoutes);
app.use('/api/files', dbCheck, fileRoutes);

app.use(notFound);
app.use(errorHandler);

socketHandler(io);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    console.log('MongoDB Connected Successfully');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  start();
}

module.exports = app;