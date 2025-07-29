import sqlite3 from 'sqlite3';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database('./invoices.db');
const migration = fs.readFileSync(join(__dirname, 'migrations', 'add_vendor_invoices_table.sql'), 'utf8');

db.exec(migration, (err) => {
  if (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  console.log('Migration completed successfully');
  db.close();
});
