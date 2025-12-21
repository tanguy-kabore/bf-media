const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await query(
      'SELECT id, email, username, display_name, avatar_url, role, is_verified, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Erreur d\'authentification' });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const users = await query(
      'SELECT id, email, username, display_name, avatar_url, role, is_verified, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length > 0 && users[0].is_active) {
      req.user = users[0];
    }
    
    next();
  } catch (error) {
    // Token invalid but we continue without user
    next();
  }
};

// Check if user has specific role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    
    next();
  };
};

// Check if user is superadmin
const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Accès superadmin requis' });
  }
  next();
};

// Check if user is admin or superadmin
const isAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès administrateur requis' });
  }
  next();
};

// Check if user is moderator, admin or superadmin
const isModerator = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès modérateur requis' });
  }
  next();
};

// Check if user is creator, moderator, admin or superadmin
const isCreator = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin', 'moderator', 'creator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès créateur requis' });
  }
  next();
};

// Socket.io authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Token requis'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const users = await query(
      'SELECT id, username, role FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      return next(new Error('Utilisateur non trouvé'));
    }

    socket.userId = users[0].id;
    socket.user = users[0];
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
};

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  return { accessToken, refreshToken };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  isSuperAdmin,
  isAdmin,
  isModerator,
  isCreator,
  authenticateSocket,
  generateTokens
};
