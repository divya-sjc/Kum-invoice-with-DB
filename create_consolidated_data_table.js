// Script to create the consolidated_data table in invoices.db
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'invoices.db');
const db = new sqlite3.Database(dbPath);

const createTableSQL = `
CREATE TABLE IF NOT EXISTS consolidated_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sl_no TEXT,
    product TEXT,
    invoice_date TEXT,
    payment_received_from_client TEXT,
    client TEXT,
    qty TEXT,
    bank_transferred_amount_usd TEXT,
    total_banktransfer_amount_in_inr TEXT,
    courier TEXT,
    customs TEXT,
    misc_charges TEXT,
    emd_charges TEXT,
    epbg_charges TEXT,
    total_landing_cost TEXT,
    total_landing_cost_per_pc TEXT,
    igst_from_customs TEXT,
    total_invoice_amount_without_gst TEXT,
    selling_price TEXT,
    gst_collected_from_client TEXT,
    gst_paid_to_vendor TEXT,
    difference_in_gst_amount TEXT,
    profit_per_pc TEXT,
    profit_total TEXT,
    profit_percent TEXT,
    payment_recvd_bank TEXT,
    payment_made_to_vendor TEXT,
    shipment_arranged_from_vendor TEXT,
    customs_cleared TEXT,
    regularization_govt_registration TEXT,
    products_received TEXT,
    delivery_challan_invoice_prepared TEXT,
    shipment_delivered_to_client TEXT,
    pick_up_no TEXT,
    boe_no TEXT,
    awb TEXT
);
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating consolidated_data table:', err.message);
  } else {
    console.log('consolidated_data table created or already exists.');
  }
  db.close();
});
