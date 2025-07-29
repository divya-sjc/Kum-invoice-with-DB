const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./invoices.db');

console.log('Checking tick field values in database...');

db.all('SELECT rowid as id, payment_made_to_vendor, shipment_arranged_from_vendor, customs_cleared FROM consolidated LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Found', rows.length, 'rows');
    rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log('  ID:', row.id);
      console.log('  payment_made_to_vendor:', JSON.stringify(row.payment_made_to_vendor), '(type:', typeof row.payment_made_to_vendor, ')');
      console.log('  shipment_arranged_from_vendor:', JSON.stringify(row.shipment_arranged_from_vendor), '(type:', typeof row.shipment_arranged_from_vendor, ')');
      console.log('  customs_cleared:', JSON.stringify(row.customs_cleared), '(type:', typeof row.customs_cleared, ')');
    });
  }
  db.close();
});
