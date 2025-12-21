const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Log an activity to the database
 * @param {Object} params - Activity parameters
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.action - Action name (e.g., 'login', 'upload_video', 'delete_comment')
 * @param {string} params.actionType - Type of action ('auth', 'video', 'channel', 'comment', 'admin', 'user', 'system')
 * @param {string} params.targetType - Type of target (e.g., 'video', 'user', 'channel')
 * @param {string} params.targetId - ID of the target
 * @param {Object} params.details - Additional details as JSON
 * @param {Object} req - Express request object (for IP and user agent)
 */
async function logActivity({ userId, action, actionType = 'system', targetType = null, targetId = null, details = null }, req = null) {
  try {
    const id = uuidv4();
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await query(`
      INSERT INTO activity_logs (id, user_id, action, action_type, target_type, target_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, action, actionType, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress, userAgent]);

    return id;
  } catch (error) {
    console.error('Error logging activity:', error.message);
    return null;
  }
}

// Action constants for consistency
const ACTIONS = {
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  
  // Video actions
  UPLOAD_VIDEO: 'upload_video',
  DELETE_VIDEO: 'delete_video',
  UPDATE_VIDEO: 'update_video',
  PUBLISH_VIDEO: 'publish_video',
  WATCH_VIDEO: 'watch_video',
  
  // Channel actions
  CREATE_CHANNEL: 'create_channel',
  UPDATE_CHANNEL: 'update_channel',
  
  // Comment actions
  ADD_COMMENT: 'add_comment',
  DELETE_COMMENT: 'delete_comment',
  
  // User actions
  UPDATE_PROFILE: 'update_profile',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  LIKE_VIDEO: 'like_video',
  DISLIKE_VIDEO: 'dislike_video',
  SAVE_VIDEO: 'save_video',
  
  // Admin actions
  ADMIN_UPDATE_USER: 'admin_update_user',
  ADMIN_DELETE_USER: 'admin_delete_user',
  ADMIN_VERIFY_USER: 'admin_verify_user',
  ADMIN_BAN_USER: 'admin_ban_user',
  ADMIN_DELETE_VIDEO: 'admin_delete_video',
  ADMIN_DELETE_COMMENT: 'admin_delete_comment',
  ADMIN_UPDATE_SETTINGS: 'admin_update_settings',
  ADMIN_CREATE_AD: 'admin_create_ad',
  ADMIN_UPDATE_AD: 'admin_update_ad',
  ADMIN_DELETE_AD: 'admin_delete_ad',
  ADMIN_HANDLE_REPORT: 'admin_handle_report',
};

const ACTION_TYPES = {
  AUTH: 'auth',
  VIDEO: 'video',
  CHANNEL: 'channel',
  COMMENT: 'comment',
  ADMIN: 'admin',
  USER: 'user',
  SYSTEM: 'system',
};

module.exports = { logActivity, ACTIONS, ACTION_TYPES };
