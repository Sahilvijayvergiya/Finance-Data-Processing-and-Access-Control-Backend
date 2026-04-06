const express = require('express');
const cors = require('cors');

const app = express();

// Middleware - try different approaches
app.use(cors());
app.use(express.json()); // For JSON
app.use(express.urlencoded({ extended: true })); // For form data

// Debug all requests
app.use((req, res, next) => {
  console.log('=== REQUEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Raw Body:', req.body);
  console.log('===================');
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Minimal server is running!'
  });
});

// Very simple login
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt with body:', req.body);
  
  // Try multiple ways to get the data
  const username = req.body.username || req.body.user || req.query.username;
  const password = req.body.password || req.body.pass || req.query.password;
  
  console.log('Extracted - Username:', username, 'Password:', password);
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      token: 'test-token-12345',
      user: { id: 1, username, role: 'admin' }
    });
  } else {
    res.status(401).json({ 
      error: 'Invalid credentials',
      debug: { 
        receivedBody: req.body,
        extracted: { username, password }
      }
    });
  }
});

// Test endpoint
app.post('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    receivedBody: req.body,
    contentType: req.get('Content-Type')
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    body: req.body
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
});

module.exports = app;
