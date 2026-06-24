/**
 * @what  Seeds the users table with four demo accounts matching the
 *        client's three user types plus an admin.
 * @why   The A2 rubric requires demonstrable role-based access. These
 *        accounts let the marker log in as each persona and see different
 *        dashboard content without needing to create accounts manually.
 * @alternative-considered  Seeding pre-hashed passwords was considered
 *        but hashing at runtime keeps the seed script portable and the
 *        passwords visible in one place for the demo.
 * @module-source  IFQ716 Week 7, bcrypt password hashing
 *
 * Usage: node server/scripts/seed-users.js
 * Requires: DATABASE_URL env var pointing to MySQL
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SALT_ROUNDS = 10;
const DEMO_PASSWORD = 'DemoPass123!';

const ALL_REGIONS = JSON.stringify(['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays']);

const DEMO_USERS = [
  {
    email: 'admin@demo.com',
    role: 'admin',
    regions: ALL_REGIONS,
    tier: 'full'
  },
  {
    email: 'gov@demo.com',
    role: 'government',
    regions: ALL_REGIONS,
    tier: 'full'
  },
  {
    email: 'operator@demo.com',
    role: 'operator',
    regions: JSON.stringify(['Cairns']),
    tier: 'spend-only'
  },
  {
    email: 'dmo@demo.com',
    role: 'dmo',
    regions: JSON.stringify(['Gold Coast', 'Noosa']),
    tier: 'full'
  }
];

async function seedUsers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const schemaSQL = readFileSync(
      join(__dirname, '..', 'src', 'db', 'init', '03_users_schema.sql'),
      'utf-8'
    );
    await connection.execute(schemaSQL);
    console.log('[seed-users] users table created or already exists');

    const hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    for (const user of DEMO_USERS) {
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (existing.length > 0) {
        console.log(`[seed-users] ${user.email} already exists, skipping`);
        continue;
      }

      await connection.execute(
        `INSERT INTO users (email, password_hash, role, regions, tier)
         VALUES (?, ?, ?, ?, ?)`,
        [user.email, hash, user.role, user.regions, user.tier]
      );

      console.log(`[seed-users] created ${user.email} (${user.role}, ${user.tier})`);
    }

    console.log('[seed-users] done');
  } finally {
    await connection.end();
  }
}

seedUsers().catch((err) => {
  console.error('[seed-users] failed:', err.message);
  process.exit(1);
});
