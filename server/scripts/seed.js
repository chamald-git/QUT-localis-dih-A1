import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = await mysql.createPool(process.env.DATABASE_URL);

async function getRegionMap() {
  const [rows] = await pool.query('SELECT id, name FROM regions');
  return Object.fromEntries(rows.map(r => [r.name.toLowerCase(), r.id]));
}

function normaliseRegion(raw) {
  const map = {
    'whitsunday': 'whitsundays',
    'whitsundays': 'whitsundays',
    'cairns': 'cairns',
    'gold coast': 'gold coast',
    'noosa': 'noosa',
  };
  return map[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();
}

function parseDate(raw) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const [d, m, y] = raw.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function seedOccupancy(regionMap) {
  const csv = fs.readFileSync(
    path.join(__dirname, '../../data/Historical Occupancy and Average Daily Rate.csv')
  );
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  const values = rows.map(r => [
    regionMap[normaliseRegion(r.lga_name)],
    parseDate(r.date),
    r.average_historical_occupancy,
    r.average_daily_rate,
  ]);
  await pool.query(
    `INSERT IGNORE INTO occupancy (region_id, date, occupancy_pct, adr) VALUES ?`,
    [values]
  );
  console.log(`Seeded ${values.length} occupancy rows`);
}

async function seedLengthOfStay(regionMap) {
  const csv = fs.readFileSync(
    path.join(__dirname, '../../data/Length of Stay and Reservation Window.csv')
  );
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  const values = rows.map(r => [
    regionMap[normaliseRegion(r.lga_name)],
    parseDate(r.date),
    r.average_length_of_stay,
    r.average_booking_window,
  ]);
  await pool.query(
    `INSERT IGNORE INTO length_of_stay (region_id, date, avg_length_of_stay, avg_booking_window) VALUES ?`,
    [values]
  );
  console.log(`Seeded ${values.length} length_of_stay rows`);
}

async function seedSpend(regionMap) {
  const csv = fs.readFileSync(
    path.join(__dirname, '../../data/spend_data.csv')
  );
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  const values = rows.map(r => [
    regionMap[normaliseRegion(r.region)],
    parseDate(r.date),
    r.category.trim(),
    r.spend,
    r.cards_seen,
    r.no_txns,
  ]);
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    await pool.query(
      `INSERT IGNORE INTO spend (region_id, date, category, spend, cards_seen, no_txns) VALUES ?`,
      [values.slice(i, i + BATCH)]
    );
  }
  console.log(`Seeded ${values.length} spend rows`);
}

async function run() {
  const regionMap = await getRegionMap();
  console.log('Region map:', regionMap);
  await seedOccupancy(regionMap);
  await seedLengthOfStay(regionMap);
  await seedSpend(regionMap);
  await pool.end();
  console.log('Seed complete');
}

run().catch(err => { console.error(err); process.exit(1); });