// Database adapter that can switch between SQLite and PostgreSQL
const { testConnection: testPgConnection } = require('./pg-config');

let dbType = 'sqlite'; // Default to SQLite for testing
let dbInstance = null;

// Check if we should force SQLite (useful for Render without PostgreSQL)
function shouldForceSQLite() {
  return process.env.DB_TYPE === 'sqlite' || 
         !process.env.DB_HOST || 
         !process.env.DB_NAME || 
         !process.env.DB_USER;
}

async function initializeDatabase() {
  try {
    console.log('Testing database connections...');
    
    // Force SQLite if environment variables are missing or DB_TYPE=sqlite
    if (shouldForceSQLite()) {
      console.log('⚠️ Forcing SQLite (missing DB credentials or DB_TYPE=sqlite)');
      dbType = 'sqlite';
      const sqliteInit = require('./sqlite-init');
      await sqliteInit.initializeDatabase();
      console.log('✅ SQLite database initialized');
      return { type: 'sqlite', connected: true };
    }
    
    // Try PostgreSQL first, fallback to SQLite
    const pgConnected = await testPgConnection();
    
    if (pgConnected) {
      console.log('✅ PostgreSQL connection successful');
      dbType = 'postgresql';
      const pgInit = require('./init');
      await pgInit.initializeDatabase();
      console.log('✅ PostgreSQL database initialized');
      return { type: 'postgresql', connected: true };
    } else {
      console.log('⚠️ PostgreSQL not available, using SQLite');
      dbType = 'sqlite';
      const sqliteInit = require('./sqlite-init');
      await sqliteInit.initializeDatabase();
      console.log('✅ SQLite database initialized');
      return { type: 'sqlite', connected: true };
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function getDatabase() {
  if (dbType === 'postgresql') {
    const pgInit = require('./init');
    return await pgInit.getDatabase();
  } else {
    const sqliteInit = require('./sqlite-init');
    return sqliteInit.getDatabase();
  }
}

function getDatabaseType() {
  return dbType;
}

module.exports = {
  initializeDatabase,
  getDatabase,
  getDatabaseType
};
