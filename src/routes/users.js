const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase, getDatabaseType } = require('../database/db-adapter');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate, userSchema } = require('../middleware/validation');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  try {
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `SELECT u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
                  r.name as role, r.permissions
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           ORDER BY u.created_at DESC`
        );
        
        const formattedUsers = result.rows.map(user => ({
          ...user,
          permissions: user.permissions
        }));
        
        res.json(formattedUsers);
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      db.all(
        `SELECT u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
                r.name as role, r.permissions
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         ORDER BY u.created_at DESC`,
        (err, users) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          const formattedUsers = users.map(user => ({
            ...user,
            permissions: JSON.parse(user.permissions)
          }));
          
          res.json(formattedUsers);
        }
      );
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `SELECT u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
                  r.name as role, r.permissions
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.id = $1`,
          [req.user.userId]
        );
        
        const user = result.rows[0];
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      db.get(
        `SELECT u.id, u.username, u.email, u.status, u.created_at, u.updated_at,
                r.name as role, r.permissions
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = ?`,
        [req.user.userId],
        (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          res.json({
            ...user,
            permissions: JSON.parse(user.permissions)
          });
        }
      );
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requirePermission('manage_users'), validate(userSchema), async (req, res) => {
  try {
    const { username, email, password, role_id, status } = req.validatedBody;
    const pool = await getDatabase();
    const client = await pool.connect();
    
    try {
      // Check if role exists
      const roleResult = await client.query('SELECT id FROM roles WHERE id = $1', [role_id]);
      
      if (roleResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert user
      const result = await client.query(
        'INSERT INTO users (username, email, password_hash, role_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [username, email, passwordHash, role_id, status]
      );
      
      res.status(201).json({
        message: 'User created successfully',
        userId: result.rows[0].id
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      if (error.constraint.includes('username')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (error.constraint.includes('email')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role_id, status } = req.body;
    const db = getDatabase();
    
    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      
      if (username !== undefined) {
        updates.push('username = ?');
        values.push(username);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }
      if (role_id !== undefined) {
        updates.push('role_id = ?');
        values.push(role_id);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              if (err.message.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
              }
              if (err.message.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
              }
            }
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({ message: 'User updated successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requirePermission('manage_users'), (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  // Prevent self-deletion
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// Get available roles
router.get('/roles', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT id, name, permissions FROM roles ORDER BY name', (err, roles) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions)
    }));
    
    res.json(formattedRoles);
  });
});

module.exports = router;
