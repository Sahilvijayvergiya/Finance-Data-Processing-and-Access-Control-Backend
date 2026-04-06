const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase, getDatabaseType } = require('../database/db-adapter');
const { validate, loginSchema } = require('../middleware/validation');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.validatedBody;
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      // PostgreSQL implementation
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `SELECT u.id, u.username, u.password_hash, u.email, u.status, r.name as role, r.permissions 
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.username = $1`,
          [username]
        );
        
        const user = result.rows[0];
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
          return res.status(401).json({ error: 'Account is inactive' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username,
            role: user.role,
            permissions: user.permissions
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions
          }
        });
      } finally {
        client.release();
      }
    } else {
      // SQLite implementation
      const db = await getDatabase();
      
      db.get(
        `SELECT u.id, u.username, u.password_hash, u.email, u.status, r.name as role, r.permissions 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.username = ?`,
        [username],
        async (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          if (user.status !== 'active') {
            return res.status(401).json({ error: 'Account is inactive' });
          }

          const isValidPassword = await bcrypt.compare(password, user.password_hash);
          if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          const token = jwt.sign(
            { 
              userId: user.id, 
              username: user.username,
              role: user.role,
              permissions: JSON.parse(user.permissions)
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.json({
            message: 'Login successful',
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              permissions: JSON.parse(user.permissions)
            }
          });
        }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    res.json({ valid: true, user });
  });
});

module.exports = router;
