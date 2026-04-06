const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Finance Backend API is running!' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'API endpoints available' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    port: process.env.PORT || 3000
  });
});

// Login endpoint (without database)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple test authentication
  if (username === 'admin' && password === 'admin123') {
    res.json({
      token: 'test-jwt-token-12345',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        permissions: ['read_dashboard', 'read_records', 'write_records', 'manage_users']
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
