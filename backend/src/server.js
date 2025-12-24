require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const channelRoutes = require('./routes/channels');
const commentRoutes = require('./routes/comments');
const playlistRoutes = require('./routes/playlists');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const subscriptionRoutes = require('./routes/subscriptions');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const streamRoutes = require('./routes/stream');
const platformRoutes = require('./routes/platform');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateSocket } = require('./middleware/auth');
const { checkMaintenanceMode } = require('./middleware/maintenanceMode');

// Import database setup
const { createSettingsTable } = require('./database/settings_table');

const app = express();
const httpServer = createServer(app);

// Trust proxy (required when behind Nginx/reverse proxy)
app.set('trust proxy', 1);

// Socket.io setup for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Create upload directories if they don't exist
const uploadDirs = ['uploads', 'uploads/videos', 'uploads/thumbnails', 'uploads/avatars', 'uploads/banners', 'uploads/temp', 'uploads/hls'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Public platform settings (before maintenance check)
app.use('/api/platform', platformRoutes);

// Maintenance mode check (before other API routes)
app.use(checkMaintenanceMode);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', userRoutes); // Avatar upload route
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/ads', require('./routes/ads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Document upload endpoint for verification
const { uploadDocument } = require('./middleware/upload');
const { authenticate } = require('./middleware/auth');
app.post('/api/upload/document', authenticate, uploadDocument.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier requis' });
  }
  res.json({ url: `/uploads/documents/${req.file.filename}` });
});

// Public platform settings endpoint (accessible without auth)
app.get('/api/platform/settings', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const settings = await query('SELECT setting_key, setting_value, setting_type FROM platform_settings');
    const publicSettings = {};
    const publicKeys = ['platform_name', 'platform_description', 'maintenance_mode', 'registration_enabled', 'ads_enabled'];
    settings.forEach(s => {
      if (publicKeys.includes(s.setting_key)) {
        if (s.setting_type === 'boolean') {
          publicSettings[s.setting_key] = s.setting_value === 'true';
        } else {
          publicSettings[s.setting_key] = s.setting_value;
        }
      }
    });
    res.json(publicSettings);
  } catch (error) {
    res.json({ platform_name: 'BF Media', maintenance_mode: false, registration_enabled: true });
  }
});

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join user's personal room for notifications
  socket.join(`user:${socket.userId}`);
  
  // Join video room for live comments
  socket.on('join-video', (videoId) => {
    socket.join(`video:${videoId}`);
  });
  
  socket.on('leave-video', (videoId) => {
    socket.leave(`video:${videoId}`);
  });
  
  // Live comment handling
  socket.on('new-comment', (data) => {
    io.to(`video:${data.videoId}`).emit('comment-added', data);
  });
  
  // View count update
  socket.on('video-view', (videoId) => {
    io.to(`video:${videoId}`).emit('view-updated', { videoId });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🎬 BF Media Server Running                      ║
  ║   📡 Port: ${PORT}                                  ║
  ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}               ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
  
  // Initialize settings table
  try {
    await createSettingsTable();
  } catch (error) {
    console.error('Failed to initialize settings table:', error);
  }
});

module.exports = { app, io };
