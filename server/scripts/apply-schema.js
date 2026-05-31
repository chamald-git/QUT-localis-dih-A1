import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = await mysql.createPool(process.env.DATABASE_URL);

const sql = fs.readFileSync(
  path.join(__dirname, '../src/db/init/02_schema.sql'), 'utf8'
);

for (const stmt of sql.split(';').map(s => s.trim()).filter(Boolean)) {
  await pool.query(stmt);
  console.log('OK:', stmt.slice(0, 60));
}

await pool.end();
console.log('Schema applied successfully');