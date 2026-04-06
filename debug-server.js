const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log('🔍 Request Debug:');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('---');
  next();
});

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt received');
  console.log('Username:', req.body.username);
  console.log('Password:', req.body.password);
  
  const { username, password } = req.body;
  
  // Simple test authentication
  if (username === 'admin' && password === 'admin123') {
    console.log('✅ Login successful for admin');
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
    console.log('❌ Login failed - invalid credentials');
    console.log('Expected: admin/admin123');
    console.log('Received:', username, '/', password);
    res.status(401).json({ error: 'Invalid credentials', debug: { received: { username, password } } });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/login'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
});

module.exports = app;
