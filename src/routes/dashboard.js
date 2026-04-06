const express = require('express');
const { getDatabase, getDatabaseType } = require('../database/db-adapter');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateQuery, filterSchema } = require('../middleware/validation');

const router = express.Router();

// Get dashboard summary
router.get('/summary', authenticateToken, requirePermission('read_dashboard'), validateQuery(filterSchema), async (req, res) => {
  try {
    const { start_date, end_date } = req.validatedQuery;
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        let dateFilter = '';
        const params = [];
        
        if (start_date && end_date) {
          dateFilter = 'WHERE date >= $1 AND date <= $2';
          params.push(start_date, end_date);
        }
        
        const summaryQuery = `
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COALESCE(COUNT(CASE WHEN type = 'income' THEN 1 END), 0) as income_transactions,
            COALESCE(COUNT(CASE WHEN type = 'expense' THEN 1 END), 0) as expense_transactions
          FROM financial_records ${dateFilter}`;
        
        const result = await client.query(summaryQuery, params);
        const summary = result.rows[0];
        
        const netBalance = parseFloat(summary.total_income) - parseFloat(summary.total_expenses);
        
        res.json({
          summary: {
            total_income: parseFloat(summary.total_income),
            total_expenses: parseFloat(summary.total_expenses),
            net_balance: netBalance,
            income_transactions: parseInt(summary.income_transactions),
            expense_transactions: parseInt(summary.expense_transactions),
            total_transactions: parseInt(summary.income_transactions) + parseInt(summary.expense_transactions)
          }
        });
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      let dateFilter = '';
      const params = [];
      
      if (start_date && end_date) {
        dateFilter = 'WHERE date >= ? AND date <= ?';
        params.push(start_date, end_date);
      }
      
      const summaryQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
          COALESCE(COUNT(CASE WHEN type = 'income' THEN 1 END), 0) as income_transactions,
          COALESCE(COUNT(CASE WHEN type = 'expense' THEN 1 END), 0) as expense_transactions
        FROM financial_records ${dateFilter}`;
      
      db.get(summaryQuery, params, (err, summary) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        const netBalance = parseFloat(summary.total_income) - parseFloat(summary.total_expenses);
        
        res.json({
          summary: {
            total_income: parseFloat(summary.total_income),
            total_expenses: parseFloat(summary.total_expenses),
            net_balance: netBalance,
            income_transactions: parseInt(summary.income_transactions),
            expense_transactions: parseInt(summary.expense_transactions),
            total_transactions: parseInt(summary.income_transactions) + parseInt(summary.expense_transactions)
          }
        });
      });
    }
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent transactions
router.get('/recent', authenticateToken, requirePermission('read_dashboard'), validateQuery(filterSchema), async (req, res) => {
  try {
    const { limit = 10 } = req.validatedQuery;
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `SELECT 
            fr.id,
            fr.amount,
            fr.type,
            fr.date,
            fr.description,
            c.name as category_name,
            u.username as created_by
          FROM financial_records fr
          JOIN categories c ON fr.category_id = c.id
          JOIN users u ON fr.user_id = u.id
          ORDER BY fr.created_at DESC
          LIMIT $1`,
          [limit]
        );
        
        res.json({ transactions: result.rows });
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      db.all(
        `SELECT 
          fr.id,
          fr.amount,
          fr.type,
          fr.date,
          fr.description,
          c.name as category_name,
          u.username as created_by
        FROM financial_records fr
        JOIN categories c ON fr.category_id = c.id
        JOIN users u ON fr.user_id = u.id
        ORDER BY fr.created_at DESC
        LIMIT ?`,
        [limit],
        (err, transactions) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({ transactions });
        }
      );
    }
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics data (analyst+ only)
router.get('/analytics', authenticateToken, requirePermission('read_analytics'), validateQuery(filterSchema), async (req, res) => {
  try {
    const { start_date, end_date } = req.validatedQuery;
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      const pool = await getDatabase();
      const client = await pool.connect();
      
      try {
        let dateFilter = '';
        const params = [];
        
        if (start_date && end_date) {
          dateFilter = 'WHERE date >= $1 AND date <= $2';
          params.push(start_date, end_date);
        }
        
        // Category breakdown
        const categoryQuery = `
          SELECT 
            c.name,
            c.type,
            COALESCE(SUM(fr.amount), 0) as total,
            COUNT(fr.id) as count
          FROM categories c
          LEFT JOIN financial_records fr ON c.id = fr.category_id ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '') : ''}
          GROUP BY c.id, c.name, c.type
          ORDER BY total DESC`;
        
        const categoryResult = await client.query(categoryQuery, params);
        
        // Monthly trends
        const monthlyQuery = `
          SELECT 
            strftime('%Y-%m', date) as month,
            type,
            COALESCE(SUM(amount), 0) as total,
            COUNT(id) as count
          FROM financial_records ${dateFilter}
          GROUP BY strftime('%Y-%m', date), type
          ORDER BY month DESC, type`;
        
        const monthlyResult = await client.query(monthlyQuery, params);
        
        res.json({
          category_breakdown: categoryResult.rows,
          monthly_trends: monthlyResult.rows
        });
      } finally {
        client.release();
      }
    } else {
      const db = await getDatabase();
      
      let dateFilter = '';
      const params = [];
      
      if (start_date && end_date) {
        dateFilter = 'WHERE date >= ? AND date <= ?';
        params.push(start_date, end_date);
      }
      
      // Category breakdown
      const categoryQuery = `
        SELECT 
          c.name,
          c.type,
          COALESCE(SUM(fr.amount), 0) as total,
          COUNT(fr.id) as count
        FROM categories c
        LEFT JOIN financial_records fr ON c.id = fr.category_id ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '') : ''}
        GROUP BY c.id, c.name, c.type
        ORDER BY total DESC`;
      
      db.all(categoryQuery, params, (err, categoryBreakdown) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Monthly trends
        const monthlyQuery = `
          SELECT 
            strftime('%Y-%m', date) as month,
            type,
            COALESCE(SUM(amount), 0) as total,
            COUNT(id) as count
          FROM financial_records ${dateFilter}
          GROUP BY strftime('%Y-%m', date), type
          ORDER BY month DESC, type`;
        
        db.all(monthlyQuery, params, (err, monthlyTrends) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            category_breakdown: categoryBreakdown,
            monthly_trends: monthlyTrends
          });
        });
      });
    }
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
