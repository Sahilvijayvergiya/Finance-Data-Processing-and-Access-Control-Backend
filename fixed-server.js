const express = require('express');
const cors = require('cors');

const app = express();

// CRITICAL: Fix body parsing order
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Fixed server is running!'
  });
});

// FIXED Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received');
  console.log('Headers:', req.headers['content-type']);
  console.log('Body:', req.body);
  
  // Direct body access
  const { username, password } = req.body;
  
  console.log(`Username: ${username}, Password: ${password}`);
  
  if (username === 'admin' && password === 'admin123') {
    console.log('✅ Login successful');
    res.json({
      token: 'fixed-jwt-token-12345',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        permissions: ['read_dashboard', 'read_records', 'write_records', 'manage_users']
      }
    });
  } else {
    console.log('❌ Login failed');
    res.status(401).json({ 
      error: 'Invalid credentials',
      debug: {
        received: { username, password },
        expected: { username: 'admin', password: 'admin123' }
      }
    });
  }
});

// Finance endpoints (simplified)
app.get('/api/finance', (req, res) => {
  res.json({
    message: 'Finance records endpoint working',
    records: [
      { id: 1, description: 'Salary', amount: 5000, type: 'income' },
      { id: 2, description: 'Groceries', amount: 300, type: 'expense' }
    ]
  });
});

app.get('/api/finance/categories', (req, res) => {
  res.json({
    message: 'Categories endpoint working',
    categories: [
      { id: 1, name: 'Salary', type: 'income' },
      { id: 2, name: 'Food', type: 'expense' }
    ]
  });
});

// Users endpoint
app.get('/api/users', (req, res) => {
  res.json({
    message: 'Users endpoint working',
    users: [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'analyst', role: 'analyst' }
    ]
  });
});

// Dashboard endpoint
app.get('/api/dashboard/summary', (req, res) => {
  res.json({
    message: 'Dashboard summary working',
    summary: {
      totalIncome: 5000,
      totalExpenses: 300,
      balance: 4700
    }
  });
});

// 404 handler with helpful info
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/finance',
      'GET /api/finance/categories',
      'GET /api/users',
      'GET /api/dashboard/summary'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FIXED server running on port ${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
});

module.exports = app;
