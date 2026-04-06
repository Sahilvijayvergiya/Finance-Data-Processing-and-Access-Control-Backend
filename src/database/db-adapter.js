// Database adapter that can switch between SQLite and PostgreSQL
const { testConnection: testPgConnection } = require('./pg-config');

let dbType = 'sqlite'; // Default to SQLite for testing
let dbInstance = null;

async function initializeDatabase() {
  // Try PostgreSQL first, fallback to SQLite
  const pgConnected = await testPgConnection();
  
  if (pgConnected) {
    console.log('Using PostgreSQL database');
    dbType = 'postgresql';
    const pgInit = require('./init');
    await pgInit.initializeDatabase();
    return { type: 'postgresql', connected: true };
  } else {
    console.log('PostgreSQL not available, using SQLite for testing');
    dbType = 'sqlite';
    const sqliteInit = require('./sqlite-init');
    await sqliteInit.initializeDatabase();
    return { type: 'sqlite', connected: true };
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
