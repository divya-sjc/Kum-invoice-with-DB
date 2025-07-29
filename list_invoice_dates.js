// Script to print all invoice numbers and their dates for debugging order issues
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./invoices.db');

db.all("SELECT invoiceNumber, date FROM invoices ORDER BY date DESC", [], (err, rows) => {
  if (err) {
    console.error("DB ERROR:", err);
    process.exit(1);
  }
  console.log("InvoiceNumber\tDate");
  rows.forEach(row => {
    console.log(`${row.invoiceNumber}\t${row.date}`);
  });
  db.close();
});
