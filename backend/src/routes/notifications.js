const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get user notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'user_id = ?';
  if (unreadOnly === 'true') {
    whereClause += ' AND is_read = FALSE';
  }

  const notifications = await query(`
    SELECT id, type, title, message, link, thumbnail_url, is_read, created_at
    FROM notifications
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`, [req.user.id]);
  const [{ unread }] = await query('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);

  res.json({
    notifications,
    unreadCount: unread,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
}));

// Mark notification as read
router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ message: 'Notification marquée comme lue' });
}));

// Mark all notifications as read
router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'Toutes les notifications marquées comme lues' });
}));

// Delete notification
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ message: 'Notification supprimée' });
}));

// Delete all notifications
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'Toutes les notifications supprimées' });
}));

module.exports = router;
