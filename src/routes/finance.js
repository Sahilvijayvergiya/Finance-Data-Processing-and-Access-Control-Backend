const express = require('express');
const { getDatabase, getDatabaseType } = require('../database/db-adapter');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate, validateQuery, filterSchema, recordSchema, categorySchema, financeRecordSchema, financeRecordUpdateSchema } = require('../middleware/validation');

const router = express.Router();

// Get financial records with filtering
router.get('/', authenticateToken, requirePermission('read_records'), validateQuery(filterSchema), async (req, res) => {
  try {
    const { start_date, end_date, type, category_id, limit, offset } = req.validatedQuery;
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        let query = `
          SELECT fr.id, fr.amount, fr.type, fr.date, fr.description, fr.created_at, fr.updated_at,
                 c.name as category_name, u.username as user_name
          FROM financial_records fr
          JOIN categories c ON fr.category_id = c.id
          JOIN users u ON fr.user_id = u.id
          WHERE 1=1`;
        
        const params = [];
        let paramIndex = 1;
        
        if (start_date) {
          query += ` AND fr.date >= $${paramIndex++}`;
          params.push(start_date);
        }
        
        if (end_date) {
          query += ` AND fr.date <= $${paramIndex++}`;
          params.push(end_date);
        }
        
        if (type) {
          query += ` AND fr.type = $${paramIndex++}`;
          params.push(type);
        }
        
        if (category_id) {
          query += ` AND fr.category_id = $${paramIndex++}`;
          params.push(category_id);
        }
        
        query += ` ORDER BY fr.date DESC, fr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        
        const result = await client.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM financial_records fr WHERE 1=1';
        const countParams = [];
        let countIndex = 1;
        
        if (start_date) {
          countQuery += ` AND fr.date >= $${countIndex++}`;
          countParams.push(start_date);
        }
        
        if (end_date) {
          countQuery += ` AND fr.date <= $${countIndex++}`;
          countParams.push(end_date);
        }
        
        if (type) {
          countQuery += ` AND fr.type = $${countIndex++}`;
          countParams.push(type);
        }
        
        if (category_id) {
          countQuery += ` AND fr.category_id = $${countIndex++}`;
          countParams.push(category_id);
        }
        
        const countResult = await client.query(countQuery, countParams);
        
        res.json({
          records: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        });
      } finally {
        client.release();
      }
    } else {
      // SQLite implementation
      const db = await getDatabase();
      
      let query = `
        SELECT fr.id, fr.amount, fr.type, fr.date, fr.description, fr.created_at, fr.updated_at,
               c.name as category_name, u.username as user_name
        FROM financial_records fr
        JOIN categories c ON fr.category_id = c.id
        JOIN users u ON fr.user_id = u.id
        WHERE 1=1`;
      
      const params = [];
      
      if (start_date) {
        query += ' AND fr.date >= ?';
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND fr.date <= ?';
        params.push(end_date);
      }
      
      if (type) {
        query += ' AND fr.type = ?';
        params.push(type);
      }
      
      if (category_id) {
        query += ' AND fr.category_id = ?';
        params.push(category_id);
      }
      
      query += ' ORDER BY fr.date DESC, fr.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(query, params, (err, records) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM financial_records fr WHERE 1=1';
        const countParams = [];
        
        if (start_date) {
          countQuery += ' AND fr.date >= ?';
          countParams.push(start_date);
        }
        
        if (end_date) {
          countQuery += ' AND fr.date <= ?';
          countParams.push(end_date);
        }
        
        if (type) {
          countQuery += ' AND fr.type = ?';
          countParams.push(type);
        }
        
        if (category_id) {
          countQuery += ' AND fr.category_id = ?';
          countParams.push(category_id);
        }
        
        db.get(countQuery, countParams, (err, count) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            records: records,
            pagination: {
              total: count.total,
              limit: parseInt(limit),
              offset: parseInt(offset)
            }
          });
        });
      });
    }
  } catch (error) {
    console.error('Get financial records error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories
router.get('/categories', authenticateToken, requirePermission('read_records'), async (req, res) => {
  try {
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT id, name, type FROM categories ORDER BY type, name');
        res.json(result.rows);
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      db.all('SELECT id, name, type FROM categories ORDER BY type, name', (err, categories) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(categories);
      });
    }
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/categories', authenticateToken, requirePermission('manage_users'), validate(categorySchema), (req, res) => {
  const { name, type } = req.validatedBody;
  const db = getDatabase();
  
  db.run(
    'INSERT INTO categories (name, type) VALUES (?, ?)',
    [name, type],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Category name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(201).json({
        message: 'Category created successfully',
        categoryId: this.lastID
      });
    }
  );
});

// Get single financial record
router.get('/:id', authenticateToken, requirePermission('read_records'), (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get(
    `SELECT fr.id, fr.amount, fr.type, fr.date, fr.description, fr.created_at, fr.updated_at,
            c.name as category_name, u.username as created_by
     FROM financial_records fr
     JOIN categories c ON fr.category_id = c.id
     JOIN users u ON fr.user_id = u.id
     WHERE fr.id = ?`,
    [id],
    (err, record) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      res.json(record);
    }
  );
});

// Create financial record
router.post('/', authenticateToken, requirePermission('write_records'), validate(recordSchema), async (req, res) => {
  try {
    const { amount, type, category_id, date, description } = req.validatedBody;
    const dbType = getDatabaseType();

    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();

      try {
        // Verify category exists and matches type
        const categoryResult = await client.query('SELECT id, type FROM categories WHERE id = $1', [category_id]);

        if (categoryResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid category' });
        }

        const category = categoryResult.rows[0];

        if (category.type !== type) {
          return res.status(400).json({ error: 'Category type does not match record type' });
        }

        // Insert record
        const result = await client.query(
          'INSERT INTO financial_records (user_id, category_id, amount, type, date, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [req.user.userId, category_id, amount, type, date, description]
        );

        res.status(201).json({
          message: 'Financial record created successfully',
          id: result.rows[0].id
        });
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();

      // Verify category exists and matches type
      db.get('SELECT id, type FROM categories WHERE id = ?', [category_id], (err, category) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!category) {
          return res.status(400).json({ error: 'Invalid category' });
        }

        if (category.type !== type) {
          return res.status(400).json({ error: 'Category type does not match record type' });
        }

        db.run(
          'INSERT INTO financial_records (user_id, category_id, amount, type, date, description) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.userId, category_id, amount, type, date, description],
          function(err, result) {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            res.status(201).json({
              message: 'Financial record created successfully',
              id: result.lastID
            });
          }
        );
      });
    }
  } catch (error) {
    console.error('Create financial record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update financial record
router.put('/:id', authenticateToken, requirePermission('write_records'), validate(financeRecordUpdateSchema), (req, res) => {
  const { id } = req.params;
  const updates = req.validatedBody;
  const db = getDatabase();
  
  // Check if record exists
  db.get('SELECT id FROM financial_records WHERE id = ?', [id], (err, record) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // If updating category, verify it exists and matches type
    if (updates.category_id) {
      const recordType = updates.type || null;
      
      db.get('SELECT id, type FROM categories WHERE id = ?', [updates.category_id], (err, category) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!category) {
          return res.status(400).json({ error: 'Invalid category' });
        }
        
        if (recordType && category.type !== recordType) {
          return res.status(400).json({ error: 'Category type does not match record type' });
        }
        
        performUpdate();
      });
    } else {
      performUpdate();
    }
    
    function performUpdate() {
      const updateFields = [];
      const values = [];
      
      if (updates.amount !== undefined) {
        updateFields.push('amount = ?');
        values.push(updates.amount);
      }
      if (updates.type !== undefined) {
        updateFields.push('type = ?');
        values.push(updates.type);
      }
      if (updates.category_id !== undefined) {
        updateFields.push('category_id = ?');
        values.push(updates.category_id);
      }
      if (updates.date !== undefined) {
        updateFields.push('date = ?');
        values.push(updates.date);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        values.push(updates.description);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      db.run(
        `UPDATE financial_records SET ${updateFields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({ message: 'Financial record updated successfully' });
        }
      );
    }
  });
});

// Delete financial record
router.delete('/:id', authenticateToken, requirePermission('write_records'), (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM financial_records WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ message: 'Financial record deleted successfully' });
  });
});

module.exports = router;
