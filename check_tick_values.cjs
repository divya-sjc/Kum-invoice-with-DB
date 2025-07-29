const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./invoices.db');

console.log('Checking ALL unique tick field values in database...');

db.all(`SELECT DISTINCT payment_made_to_vendor, shipment_arranged_from_vendor, customs_cleared, 
               regularization_govt_registration, products_recveived, delivery_challan_invoice_prepared, 
               shipment_delivered_to_client FROM consolidated LIMIT 20`, (err, rows) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Found', rows.length, 'unique combinations');
    rows.forEach((row, index) => {
      console.log(`\nCombination ${index + 1}:`);
      console.log('  payment_made_to_vendor:', JSON.stringify(row.payment_made_to_vendor));
      console.log('  shipment_arranged_from_vendor:', JSON.stringify(row.shipment_arranged_from_vendor));
      console.log('  customs_cleared:', JSON.stringify(row.customs_cleared));
      console.log('  regularization_govt_registration:', JSON.stringify(row.regularization_govt_registration));
      console.log('  products_recveived:', JSON.stringify(row.products_recveived));
      console.log('  delivery_challan_invoice_prepared:', JSON.stringify(row.delivery_challan_invoice_prepared));
      console.log('  shipment_delivered_to_client:', JSON.stringify(row.shipment_delivered_to_client));
    });
  }
  db.close();
});
