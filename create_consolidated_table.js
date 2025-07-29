import sqlite3 from 'sqlite3';
import fs from 'fs';

const db = new sqlite3.Database('./invoices.db');

const sql = fs.readFileSync('./migrations/recreate_consolidated_table.sql', 'utf8');

db.run(sql, (err) => {
  if (err) {
    console.error('Error creating consolidated table:', err);
  } else {
    console.log('✅ Consolidated table created successfully');
  }
  
  // Verify the table was created
  db.all("PRAGMA table_info(consolidated)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
    } else {
      console.log('📋 Consolidated table columns:');
      columns.forEach((col, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${col.name.padEnd(30)} (${col.type})`);
      });
    }
    db.close();
  });
});
