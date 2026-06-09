/**
 * scripts/reset-admin-password.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot utility: sets the "admin" account password to the value defined in
 * NEW_PASSWORD (default: admin123) using a bcrypt cost-12 hash.
 *
 * Usage:
 *   node scripts/reset-admin-password.js
 *
 * Override the target password without editing this file:
 *   NEW_PASSWORD=MyStr0ngPass node scripts/reset-admin-password.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mysql  from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path   from 'path';
import { fileURLToPath } from 'url';

// Resolve project root so .env is found regardless of cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Configuration ────────────────────────────────────────────────────────────
const TARGET_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const NEW_PASSWORD    = process.env.NEW_PASSWORD   || 'admin123';
const BCRYPT_ROUNDS   = 12;

// ── Main ─────────────────────────────────────────────────────────────────────
const run = async () => {
  let conn;

  try {
    // 1. Connect
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306', 10),
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'ujarma',
      timezone: '+00:00',
      charset:  'utf8mb4',
    });

    // 2. Verify the account exists before attempting an update
    const [rows] = await conn.execute(
      'SELECT id FROM admins WHERE username = ? LIMIT 1',
      [TARGET_USERNAME]
    );

    if (rows.length === 0) {
      console.error(`  ✗ Admin account "${TARGET_USERNAME}" not found in the database.`);
      console.error('    Run the application once so the bootstrap seed creates it, then retry.');
      process.exit(1);
    }

    // 3. Hash the new password
    const hash = await bcrypt.hash(NEW_PASSWORD, BCRYPT_ROUNDS);

    // 4. Update
    await conn.execute(
      'UPDATE admins SET password_hash = ? WHERE username = ?',
      [hash, TARGET_USERNAME]
    );

    console.log(`  ✓ Admin password updated successfully`);
    console.log(`    Username : ${TARGET_USERNAME}`);
    console.log(`    Password : ${NEW_PASSWORD}`);
    console.log(`    Hash     : ${hash.substring(0, 29)}… (bcrypt, cost ${BCRYPT_ROUNDS})`);

  } catch (err) {
    console.error('  ✗ Failed to update password:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
};

run();
