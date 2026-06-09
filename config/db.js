/**
 * config/db.js — MySQL2 Connection Pool
 * =======================================
 * Creates a shared connection pool for efficient
 * database access throughout the application.
 */

import mysql  from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a reusable connection pool
const pool = mysql.createPool({
  host:                  process.env.DB_HOST     || 'localhost',
  port:                  parseInt(process.env.DB_PORT || '3306', 10),
  user:                  process.env.DB_USER     || 'root',
  password:              process.env.DB_PASSWORD || '',
  database:              process.env.DB_NAME     || 'ujarma_db',
  waitForConnections:    true,
  connectionLimit:       10,
  queueLimit:            0,
  enableKeepAlive:       true,
  keepAliveInitialDelay: 0,
  timezone:              '+00:00',
  charset:               'utf8mb4',
});

/**
 * Verify database connectivity on application startup.
 * Logs a warning instead of crashing if the DB is unavailable,
 * allowing the UI to still serve static pages.
 */
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('  ✓ Database connected successfully');
    connection.release();
  } catch (error) {
    console.warn('  ⚠  Database connection failed:', error.message);
    console.warn('  ⚠  The app will run, but dynamic content will be unavailable.');
  }
};

export default pool;
