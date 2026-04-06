const { pool } = require('./pg-config');

// PostgreSQL database connection
async function getDatabase() {
  return pool;
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing PostgreSQL database...');
    
    // Create tables in PostgreSQL syntax
    const tables = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        permissions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Financial records table
      `CREATE TABLE IF NOT EXISTS financial_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    // Create tables
    for (const sql of tables) {
      await client.query(sql);
    }
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_financial_records_category_id ON financial_records(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date)',
      'CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type)'
    ];
    
    for (const sql of indexes) {
      await client.query(sql);
    }
    
    console.log('Tables and indexes created successfully');
    
    // Insert default data
    await insertDefaultData(client);
    
    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function insertDefaultData(client) {
  try {
    // Check if roles already exist
    const rolesResult = await client.query('SELECT COUNT(*) as count FROM roles');
    if (parseInt(rolesResult.rows[0].count) > 0) {
      console.log('Default data already exists');
      return;
    }
    
    // Insert default roles
    const roles = [
      { name: 'viewer', permissions: ['read_dashboard', 'read_records'] },
      { name: 'analyst', permissions: ['read_dashboard', 'read_records', 'read_analytics'] },
      { name: 'admin', permissions: ['read_dashboard', 'read_records', 'read_analytics', 'write_records', 'manage_users'] }
    ];
    
    for (const role of roles) {
      await client.query(
        'INSERT INTO roles (name, permissions) VALUES ($1, $2)',
        [role.name, JSON.stringify(role.permissions)]
      );
    }
    
    console.log('Default roles created');
    
    // Insert default categories
    const categories = [
      { name: 'Salary', type: 'income' },
      { name: 'Freelance', type: 'income' },
      { name: 'Investment', type: 'income' },
      { name: 'Food', type: 'expense' },
      { name: 'Transport', type: 'expense' },
      { name: 'Utilities', type: 'expense' },
      { name: 'Entertainment', type: 'expense' },
      { name: 'Healthcare', type: 'expense' },
      { name: 'Shopping', type: 'expense' },
      { name: 'Other', type: 'expense' }
    ];
    
    for (const category of categories) {
      await client.query(
        'INSERT INTO categories (name, type) VALUES ($1, $2)',
        [category.name, category.type]
      );
    }
    
    console.log('Default categories created');
  } catch (error) {
    console.error('Error inserting default data:', error);
    throw error;
  }
}

function closeDatabase() {
  return pool.end().then(() => {
    console.log('PostgreSQL pool closed');
  }).catch(err => {
    console.error('Error closing database pool:', err);
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
