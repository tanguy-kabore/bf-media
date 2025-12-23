const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, generateTokens } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity, ACTIONS, ACTION_TYPES } = require('../middleware/activityLogger');

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail().withMessage('Format d\'email invalide')
    .custom((value) => {
      // Vérifier que l'email se termine par @tipoko.bf
      if (!value.endsWith('@tipoko.bf')) {
        throw new Error('L\'email doit se terminer par @tipoko.bf');
      }
      // Vérifier la longueur du préfixe (minimum 3 caractères)
      const prefix = value.split('@')[0];
      if (prefix.length < 3) {
        throw new Error('L\'identifiant doit contenir au moins 3 caractères');
      }
      return true;
    })
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 50 }).withMessage('Le pseudo doit contenir entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Le pseudo ne peut contenir que des lettres, chiffres et underscores'),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('displayName').optional().isLength({ max: 100 })
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Format d\'email invalide')
    .custom((value) => {
      if (!value.endsWith('@tipoko.bf')) {
        throw new Error('L\'email doit se terminer par @tipoko.bf');
      }
      const prefix = value.split('@')[0];
      if (prefix.length < 3) {
        throw new Error('L\'identifiant doit contenir au moins 3 caractères');
      }
      return true;
    })
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
];

// Register
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password, displayName } = req.body;

  // Check if user exists
  const existing = await query(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email ou username déjà utilisé' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  // Create user
  await query(
    `INSERT INTO users (id, email, username, password_hash, display_name, role) 
     VALUES (?, ?, ?, ?, ?, 'user')`,
    [userId, email, username, passwordHash, displayName || username]
  );

  // Create default channel for user
  const channelId = uuidv4();
  const channelHandle = username.toLowerCase();
  
  await query(
    `INSERT INTO channels (id, user_id, name, handle, description) 
     VALUES (?, ?, ?, ?, ?)`,
    [channelId, userId, displayName || username, channelHandle, `Chaîne de ${displayName || username}`]
  );

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(userId);

  // Log registration
  await logActivity({
    userId,
    action: ACTIONS.REGISTER,
    actionType: ACTION_TYPES.AUTH,
    details: { username, email }
  }, req);

  res.status(201).json({
    message: 'Compte créé avec succès',
    user: {
      id: userId,
      email,
      username,
      displayName: displayName || username,
      role: 'user'
    },
    channel: {
      id: channelId,
      handle: channelHandle
    },
    accessToken,
    refreshToken
  });
}));

// Login
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Find user
  const users = await query(
    `SELECT u.*, c.id as channel_id, c.handle as channel_handle 
     FROM users u 
     LEFT JOIN channels c ON u.id = c.user_id 
     WHERE u.email = ?`,
    [email]
  );

  if (users.length === 0) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const user = users[0];

  if (!user.is_active) {
    return res.status(403).json({ error: 'Compte désactivé' });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);

  // Log login
  await logActivity({
    userId: user.id,
    action: ACTIONS.LOGIN,
    actionType: ACTION_TYPES.AUTH,
    details: { username: user.username }
  }, req);

  res.json({
    message: 'Connexion réussie',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      isVerified: user.is_verified
    },
    channel: user.channel_id ? {
      id: user.channel_id,
      handle: user.channel_handle
    } : null,
    accessToken,
    refreshToken
  });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT u.*, c.id as channel_id, c.handle as channel_handle, c.name as channel_name,
            c.subscriber_count, c.video_count, c.is_verified as channel_verified
     FROM users u 
     LEFT JOIN channels c ON u.id = c.user_id 
     WHERE u.id = ?`,
    [req.user.id]
  );

  if (users.length === 0) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  const user = users[0];

  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    role: user.role,
    isVerified: user.is_verified,
    createdAt: user.created_at,
    channel: user.channel_id ? {
      id: user.channel_id,
      handle: user.channel_handle,
      name: user.channel_name,
      subscriberCount: user.subscriber_count,
      videoCount: user.video_count,
      isVerified: user.channel_verified
    } : null
  });
}));

// Logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a production app, you would invalidate the refresh token here
  res.json({ message: 'Déconnexion réussie' });
}));

// Change password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  
  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  // Hash and update new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

  res.json({ message: 'Mot de passe modifié avec succès' });
}));

module.exports = router;
