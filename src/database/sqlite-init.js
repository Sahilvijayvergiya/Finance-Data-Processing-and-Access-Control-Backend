const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'finance.db');

let db;

function getDatabase() {
  if (!db) {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    const tables = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        permissions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles (id)
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Financial records table
      `CREATE TABLE IF NOT EXISTS financial_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        date DATE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`
    ];
    
    let completed = 0;
    tables.forEach(sql => {
      db.run(sql, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
          reject(err);
          return;
        }
        completed++;
        if (completed === tables.length) {
          insertDefaultData().then(resolve).catch(reject);
        }
      });
    });
  });
}

async function insertDefaultData() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    // Insert default roles
    const roles = [
      { name: 'viewer', permissions: JSON.stringify(['read_dashboard', 'read_records']) },
      { name: 'analyst', permissions: JSON.stringify(['read_dashboard', 'read_records', 'read_analytics']) },
      { name: 'admin', permissions: JSON.stringify(['read_dashboard', 'read_records', 'read_analytics', 'write_records', 'manage_users']) }
    ];
    
    let rolesCompleted = 0;
    roles.forEach(role => {
      db.run(
        'INSERT OR IGNORE INTO roles (name, permissions) VALUES (?, ?)',
        [role.name, role.permissions],
        (err) => {
          if (err) {
            console.error('Error inserting role:', err.message);
            reject(err);
            return;
          }
          rolesCompleted++;
          if (rolesCompleted === roles.length) {
            insertDefaultUsers().then(resolve).catch(reject);
          }
        }
      );
    });
  });
}

async function insertDefaultUsers() {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs');
    const db = getDatabase();
    
    // Default users with hashed passwords
    const users = [
      { username: 'admin', password: 'admin123', email: 'admin@example.com', role_name: 'admin' },
      { username: 'analyst', password: 'analyst123', email: 'analyst@example.com', role_name: 'analyst' },
      { username: 'viewer', password: 'viewer123', email: 'viewer@example.com', role_name: 'viewer' }
    ];
    
    let usersCompleted = 0;
    users.forEach(async (user) => {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        db.run(
          'INSERT OR IGNORE INTO users (username, email, password_hash, role_id, status) VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = ?), ?)',
          [user.username, user.email, hashedPassword, user.role_name, 'active'],
          (err) => {
            if (err) {
              console.error('Error inserting user:', err.message);
              reject(err);
              return;
            }
            usersCompleted++;
            if (usersCompleted === users.length) {
              insertDefaultCategories().then(resolve).catch(reject);
            }
          }
        );
      } catch (error) {
        console.error('Error hashing password:', error);
        reject(error);
      }
    });
  });
}

async function insertDefaultCategories() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
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
    
    let completed = 0;
    categories.forEach(category => {
      db.run(
        'INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)',
        [category.name, category.type],
        (err) => {
          if (err) {
            console.error('Error inserting category:', err.message);
            reject(err);
            return;
          }
          completed++;
          if (completed === categories.length) {
            insertSampleRecords().then(resolve).catch(reject);
          }
        }
      );
    });
  });
}

async function insertSampleRecords() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    // Sample financial records
    const records = [
      { description: 'Monthly Salary', amount: 5000, type: 'income', category_name: 'Salary', username: 'admin' },
      { description: 'Freelance Project', amount: 1200, type: 'income', category_name: 'Freelance', username: 'admin' },
      { description: 'Groceries', amount: 300, type: 'expense', category_name: 'Food', username: 'analyst' },
      { description: 'Gas', amount: 150, type: 'expense', category_name: 'Transport', username: 'analyst' },
      { description: 'Utilities', amount: 200, type: 'expense', category_name: 'Utilities', username: 'viewer' }
    ];
    
    let completed = 0;
    records.forEach(record => {
      db.run(
        'INSERT OR IGNORE INTO financial_records (description, amount, type, category_id, user_id, date) VALUES (?, ?, ?, (SELECT id FROM categories WHERE name = ?), (SELECT id FROM users WHERE username = ?), date("now"))',
        [record.description, record.amount, record.type, record.category_name, record.username],
        (err) => {
          if (err) {
            console.error('Error inserting record:', err.message);
            reject(err);
            return;
          }
          completed++;
          if (completed === records.length) {
            console.log('SQLite database initialized successfully');
            resolve();
          }
        }
      );
    });
  });
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('SQLite database connection closed');
      }
    });
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
