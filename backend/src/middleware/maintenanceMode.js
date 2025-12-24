const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const checkMaintenanceMode = async (req, res, next) => {
  // Skip maintenance check for admin routes and auth routes
  if (req.path.startsWith('/api/admin') || 
      req.path.startsWith('/api/auth') || 
      req.path.startsWith('/api/uploads')) {
    return next();
  }

  try {
    const result = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'maintenance_mode'`
    );
    
    const maintenanceMode = result.length > 0 
      ? result[0].setting_value === 'true' 
      : false;

    if (maintenanceMode) {
      // Check if user is admin by verifying token
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userResult = await query(
            'SELECT role FROM users WHERE id = ?',
            [decoded.userId]
          );
          
          if (userResult.length > 0 && ['admin', 'superadmin'].includes(userResult[0].role)) {
            return next();
          }
        } catch (err) {
          // Invalid token, continue to maintenance mode
        }
      }
      
      return res.status(503).json({ 
        error: 'Site en maintenance',
        message: 'Le site est actuellement en maintenance. Veuillez réessayer plus tard.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // Continue on error to avoid blocking the site
    next();
  }
};

module.exports = { checkMaintenanceMode };
