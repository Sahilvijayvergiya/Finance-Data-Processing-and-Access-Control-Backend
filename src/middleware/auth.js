const jwt = require('jsonwebtoken');
const { getDatabase, getDatabaseType } = require('../database/db-adapter');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const dbType = getDatabaseType();
      
      if (dbType === 'postgresql') {
        const pool = await getDatabase();
        const client = await pool.connect();
        
        try {
          const result = await client.query(
            'SELECT r.permissions FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.userId]
          );
          
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          const permissions = result.rows[0].permissions;
          
          if (!permissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          
          next();
        } finally {
          client.release();
        }
      } else {
        const db = await getDatabase();
        
        db.get(
          'SELECT r.permissions FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
          [req.user.userId],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
              return res.status(404).json({ error: 'User not found' });
            }
            
            const permissions = JSON.parse(row.permissions);
            
            if (!permissions.includes(permission)) {
              return res.status(403).json({ error: 'Insufficient permissions' });
            }
            
            next();
          }
        );
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  };
}

function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      const dbType = getDatabaseType();
      
      if (dbType === 'postgresql') {
        const pool = await getDatabase();
        const client = await pool.connect();
        
        try {
          const result = await client.query(
            'SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.userId]
          );
          
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          if (result.rows[0].name !== roleName) {
            return res.status(403).json({ error: 'Insufficient role permissions' });
          }
          
          next();
        } finally {
          client.release();
        }
      } else {
        const db = await getDatabase();
        
        db.get(
          'SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
          [req.user.userId],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
              return res.status(404).json({ error: 'User not found' });
            }
            
            if (row.name !== roleName) {
              return res.status(403).json({ error: 'Insufficient role permissions' });
            }
            
            next();
          }
        );
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  JWT_SECRET
};
