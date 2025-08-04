// Define purchaseUpload for file import
const purchaseUpload = multer({ dest: "uploads/" });
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import multer from "multer";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 4000;

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for larger payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database initialization
const dbPath = path.resolve(__dirname, "invoices.db");
console.log('Attempting to connect to database at:', dbPath);

const db = new sqlite3.Database(dbPath, 
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX, 
  (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Configure database settings
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 60000');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA temp_store = MEMORY');
  db.run('PRAGMA cache_size = -2000'); // Use up to 2MB of memory for cache
});

// Handle unexpected errors
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'SQLITE_BUSY') {
    console.log('Database is busy, waiting for lock to be released...');
  }
});

// Handle process termination
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  db.close((closeErr) => {
    if (closeErr) {
      console.error('Error closing database:', closeErr.message);
    }
    process.exit(1);
  });
});

// Initialize database tables
db.serialize(() => {
  // Create all tables if they don't exist

  // Price Comparison items table
  db.run(`CREATE TABLE IF NOT EXISTS price_comparision_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Price Comparison vendors table
  db.run(`CREATE TABLE IF NOT EXISTS price_comparision_vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    communication TEXT,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Price Comparison vendors table
  db.run(`CREATE TABLE IF NOT EXISTS price_comparision_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    vendor_id INTEGER,
    price REAL,
    quoted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
  )`);

  // Purchases table
  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    slNo INTEGER,
    date TEXT,
    description TEXT,
    credit REAL DEFAULT NULL,
    debit REAL DEFAULT NULL,
    bankPaymentRef TEXT DEFAULT '',
    clientName TEXT DEFAULT '',
    paymentRemarks TEXT DEFAULT '',
    refBankName TEXT DEFAULT '',
    invoiceNo TEXT DEFAULT '',
    inputCgst REAL DEFAULT 0,
    inputSgst REAL DEFAULT 0,
    inputIgst REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Invoices table
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    invoiceNumber TEXT PRIMARY KEY,
    date TEXT DEFAULT (datetime('now')),
    revision INTEGER DEFAULT 1,
    deliveryAddress_name TEXT,
    deliveryAddress_address TEXT,
    deliveryAddress_city TEXT,
    deliveryAddress_postalCode TEXT,
    deliveryAddress_state TEXT,
    deliveryDate TEXT,
    deliveryChallanRef TEXT,
    hsnSac TEXT,
    poRefNo TEXT,
    ewayBillRef TEXT DEFAULT '',
    invoiceTotal REAL,
    totalNet REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    grandTotal REAL DEFAULT 0,
    amountInWords TEXT DEFAULT "",
    paymentReceived REAL DEFAULT 0,
    paymentBank TEXT DEFAULT "",
    paymentBankRef TEXT DEFAULT "",
    paymentDate TEXT DEFAULT "",
    balanceDue REAL DEFAULT 0,
    paymentStatus TEXT DEFAULT "Pending",
    notes TEXT DEFAULT ""
  )`);

  // Invoice items table
  db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceNumber TEXT,
    item_description TEXT,
    quantity INTEGER,
    unitPrice REAL,
    total REAL,
    FOREIGN KEY (invoiceNumber) REFERENCES invoices(invoiceNumber)
  )`);

  // Vendors invoices table
  db.run(`CREATE TABLE IF NOT EXISTS vendors_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendorName TEXT,
    itemName TEXT,
    totalInvoiceValue REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    paymentStatus TEXT DEFAULT 'Pending',
    veshadInvoiceRefNo TEXT,
    veshadInvoiceValue REAL DEFAULT 0,
    veshadSgst REAL DEFAULT 0,
    veshadCgst REAL DEFAULT 0,
    veshadIgst REAL DEFAULT 0
  )`);

  // Status entries table
  db.run(`CREATE TABLE IF NOT EXISTS status_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slNo TEXT,
    product TEXT,
    invoiceDate TEXT,
    paymentReceivedFromClient TEXT,
    client TEXT,
    qty TEXT,
    bankTransferredAmountUSD TEXT,
    totalBankTransferAmountINR TEXT,
    courier TEXT,
    customs TEXT,
    miscCharges TEXT,
    emdCharges TEXT,
    epbgCharges TEXT,
    totalLandingCost TEXT,
    totalLandingCostPerPc TEXT,
    igstFromCustoms TEXT,
    totalInvoiceAmountWithoutGST TEXT,
    sellingPrice TEXT,
    gstCollectedFromClient TEXT,
    gstPaidToVendor TEXT,
    differenceInGSTAmount TEXT,
    profitPerPc TEXT,
    profitTotal TEXT,
    profitPercent TEXT,
    paymentRecvdBank TEXT,
    paymentMadeToVendor TEXT,
    shipmentArrangedFromVendor TEXT
  )`);

  // Delivery challans table
  db.run(`CREATE TABLE IF NOT EXISTS delivery_challans (
    challanNo TEXT PRIMARY KEY,
    order_date  TEXT,
    dispatch_date TEXT,
    bill_to_address TEXT,
    eway_bill_no TEXT,
    invoiceNumber TEXT,
    FOREIGN KEY (invoiceNumber) REFERENCES invoices(invoiceNumber)
  )`);

  // Delivery items table
db.run(`CREATE TABLE IF NOT EXISTS delivery_items (
  id INTEGER,
  challanNo TEXT,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  remarks TEXT,
  FOREIGN KEY (challanNo) REFERENCES delivery_challans(challanNo)
)`);

  // Letter table
  db.run(`CREATE TABLE IF NOT EXISTS letter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    subject TEXT,
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/api/upload-excel", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    res.json({ matchedData: data });
  } catch (err) {
    console.error("Error processing Excel file:", err);
    res.status(500).json({ error: "Failed to process Excel file" });
  }
});

// --- GET all price comparison data ---
app.get("/api/price-comparison", (req, res) => {
  // Get all items and all vendors
  db.all("SELECT * FROM price_comparision_items", [], (err, items) => {
    if (err) {
      console.error("Error fetching items:", err);
      return res.status(500).json({ error: err.message });
    }
    db.all("SELECT * FROM price_comparision_vendors", [], (err, vendors) => {
      if (err) {
        console.error("Error fetching vendors:", err);
        return res.status(500).json({ error: err.message });
      }
      db.all(
        "SELECT * FROM price_comparision_quotes",
        [],
        (err, quotes) => {
          if (err) {
            console.error("Error fetching quotes:", err);
            return res.status(500).json({ error: err.message });
          }
          // Build a matrix: each item, each vendor, with price if exists
          const vendorMap = {};
          vendors.forEach(v => { vendorMap[v.id] = v; });
          const itemMap = {};
          items.forEach(i => { itemMap[i.id] = i; });

          // Build a lookup for quotes: {item_id}-{vendor_id} => quote
          const quoteMap = {};
          quotes.forEach(q => {
            quoteMap[`${q.item_id}-${q.vendor_id}`] = q;
          });

          // Build result: array of items, each with prices array (ordered as vendors)
          const result = items.map(item => {
            const prices = vendors.map(vendor => {
              const quote = quoteMap[`${item.id}-${vendor.id}`];
              return quote ? String(quote.price) : "";
            });
            return {
              id: item.id,
              name: item.name,
              description: item.description,
              prices
            };
          });

          res.json({
            vendors: vendors.map(v => ({
              id: v.id,
              name: v.name,
              communication: v.communication,
              contact_info: v.contact_info
            })),
            items: result
          });
        }
      );
    });
  });
});


//POST endpoint for price-comparison-quotes
// Save the entire price comparison table (vendors, items, and quotes)
app.post("/api/price-comparison/quotes", (req, res) => {
  const { priceEntries } = req.body;
  if (!Array.isArray(priceEntries)) {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }

  // First, delete all existing quotes
  db.run("DELETE FROM price_comparision_quotes", [], function (delErr) {
    if (delErr) {
      return res.status(500).json({ success: false, error: "Failed to clear existing quotes" });
    }

    let completed = 0;
    let errors = [];
    if (priceEntries.length === 0) {
      return res.json({ success: true, errors: [] });
    }

    priceEntries.forEach(entry => {
      const { itemName, vendorName, price, quotedDate } = entry;
      if (!itemName || !vendorName || price === undefined) {
        errors.push(`Missing data for entry: ${JSON.stringify(entry)}`);
        completed++;
        if (completed === priceEntries.length) {
          return res.json({ success: errors.length === 0, errors });
        }
        return;
      }

      // Lookup item_id
      db.get(
        "SELECT id FROM price_comparision_items WHERE name = ?",
        [itemName],
        (err, itemRow) => {
          if (err || !itemRow) {
            errors.push(`Item not found: ${itemName}`);
            completed++;
            if (completed === priceEntries.length) {
              return res.json({ success: errors.length === 0, errors });
            }
            return;
          }
          // Lookup vendor_id
          db.get(
            "SELECT id FROM price_comparision_vendors WHERE name = ?",
            [vendorName],
            (err, vendorRow) => {
              if (err || !vendorRow) {
                errors.push(`Vendor not found: ${vendorName}`);
                completed++;
                if (completed === priceEntries.length) {
                  return res.json({ success: errors.length === 0, errors });
                }
                return;
              }
              // Insert quote
              db.run(
                `INSERT INTO price_comparision_quotes (item_id, vendor_id, price, quoted_date) VALUES (?, ?, ?, ?)`,
                [itemRow.id, vendorRow.id, price, quotedDate || null],
                function (err) {
                  if (err) {
                    errors.push(`Insert error for ${itemName}/${vendorName}: ${err.message}`);
                  }
                  completed++;
                  if (completed === priceEntries.length) {
                    return res.json({ success: errors.length === 0, errors });
                  }
                }
              );
            }
          );
        }
      );
    });
  });
});

//Add price-comparison-items
app.post("/api/price-comparison/items", (req, res) => {
  const { name, description } = req.body;
  db.run(
    `INSERT INTO price_comparision_items (name, description) VALUES (?, ?)`,
    [name, description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description });
    }
  );
});

//Add price-comparison-vendors
app.post("/api/price-comparison/vendors", (req, res) => {
  const { name, communication, contact_info } = req.body;
  db.run(
    `INSERT INTO price_comparision_vendors (name, communication, contact_info) VALUES (?, ?, ?)`,
    [name, communication, contact_info],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, communication, contact_info });
    }
  );
});

//updated quotes
app.put("/api/price-comparison/quotes/:id", (req, res) => {
  const { id } = req.params;
  const { price, name, quoted_date, remarks } = req.body;

  db.run(
    `UPDATE price_comparision_quotes SET price = ?, quoted_date = ?, remarks = ? WHERE id = ?`,
    [price, name, quoted_date, remarks, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

//Delete quotes
app.delete("/api/price-comparison/quotes/:id", (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM price_comparision_quotes WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});


// Dashboard Routes
app.get("/api/dashboard", (req, res) => {
  db.serialize(() => {
    db.get("SELECT COUNT(*) as totalInvoices FROM invoices", (err, totalInvoicesRow) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      db.get("SELECT IFNULL(SUM(grandTotal), 0) as totalRevenue FROM invoices", (err, totalRevenueRow) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        db.get("SELECT IFNULL(SUM(balanceDue), 0) as totalDue FROM invoices WHERE paymentStatus = 'Pending'", (err, totalDueRow) => {
          if (err) {
            console.error("DB ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          db.get("SELECT COUNT(*) as pendingInvoicesCount FROM invoices WHERE paymentStatus = 'Pending'", (err, pendingRow) => {
            if (err) {
              console.error("DB ERROR:", err);
              return res.status(500).json({ error: err.message });
            }

            res.json({
              totalInvoices: totalInvoicesRow.totalInvoices,
              totalRevenue: totalRevenueRow.totalRevenue,
              totalDue: totalDueRow.totalDue,
              pendingInvoicesCount: pendingRow.pendingInvoicesCount
            });
          });
        });
      });
    });
  });
});

// Invoice Counts Route
app.get("/api/invoice-counts", (req, res) => {
  db.all(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN paymentStatus = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN paymentStatus = 'Paid' THEN 1 ELSE 0 END) as paid
    FROM invoices`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching invoice counts:', err);
        return res.status(500).json({ 
          error: 'Failed to fetch invoice counts',
          details: err.message 
        });
      }
      res.json(rows[0] || { total: 0, pending: 0, paid: 0 });
    }
  );
});

// GST Routes
app.get("/api/gst-collected", (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ error: "Month is required (format: yyyy-MM)" });
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`;
  
  db.get(
    `SELECT 
      IFNULL(SUM(cgst), 0) as cgst, 
      IFNULL(SUM(sgst), 0) as sgst, 
      IFNULL(SUM(igst), 0) as igst 
    FROM invoices 
    WHERE date(date) >= date(?) AND date(date) <= date(?)`,
    [startDate, endDate],
    (err, row) => {
      if (err) {
        console.error("GST summary error:", err);
        return res.status(500).json({ error: "Failed to fetch GST summary" });
      }
      res.json({
        cgst: row.cgst || 0,
        sgst: row.sgst || 0,
        igst: row.igst || 0
      });
    }
  );
});

app.get("/api/gst-collected-fy", (req, res) => {
  const now = new Date();
  let fyStartYear = now.getFullYear();
  let fyEndYear = now.getFullYear() + 1;
  if (now.getMonth() + 1 < 4) {
    fyStartYear = now.getFullYear() - 1;
    fyEndYear = now.getFullYear();
  }
  const fyStart = `${fyStartYear}-04-01`;
  const fyEnd = `${fyEndYear}-03-31`;

  db.get(
    `SELECT 
      IFNULL(SUM(cgst), 0) as cgst, 
      IFNULL(SUM(sgst), 0) as sgst, 
      IFNULL(SUM(igst), 0) as igst 
    FROM invoices 
    WHERE date(date) >= date(?) AND date(date) <= date(?)`,
    [fyStart, fyEnd],
    (err, row) => {
      if (err) {
        console.error("GST FY summary error:", err);
        return res.status(500).json({ error: "Failed to fetch GST FY summary" });
      }
      res.json({
        cgst: row.cgst || 0,
        sgst: row.sgst || 0,
        igst: row.igst || 0
      });
    }
  );
});

// Delivery Challan Routes

// Get all delivery challans
app.get("/api/delivery-challans", (req, res) => {
  db.all("SELECT * FROM delivery_challans ORDER BY dispatch_date DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching delivery challans:", err);
      return res.status(500).json({ 
        error: 'Failed to fetch delivery challans',
        details: err.message
      });
    }
    // Parse the JSON items string for each row
    const challans = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items || '[]')
    }));
    res.json(challans);
  });
});

// Get a single delivery challan
app.get("/api/delivery-challans/:challanNo", (req, res) => {
  db.get("SELECT * FROM delivery_challans WHERE challanNo = ?", [req.params.challanNo], (err, row) => {
    if (err) {
      console.error("Error fetching delivery challan:", err);
      return res.status(500).json({
        error: 'Failed to fetch delivery challan',
        details: err.message
      });
    }
    if (!row) {
      return res.status(404).json({ error: 'Delivery challan not found' });
    }
    // Fetch all items for this challanNo from delivery_items
    db.all("SELECT * FROM delivery_items WHERE challanNo = ?", [req.params.challanNo], (itemErr, items) => {
      if (itemErr) {
        console.error("Error fetching delivery items:", itemErr);
        return res.status(500).json({
          error: 'Failed to fetch delivery items',
          details: itemErr.message
        });
      }
      row.items = items || [];
      res.json(row);
    });
  });
});

// Create new delivery challan
app.post("/api/delivery-challans", (req, res) => {
  const {
     challanNo,
     order_date,
     dispatch_date,
     bill_to_address,
     eway_bill_no,
     invoiceNumber,
     items
  } = req.body;

   if (!challanNo || !order_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: 'Challan number, date and items are required'
    });
  }

  const query = `
    INSERT INTO delivery_challans (
      challanNo, order_date, dispatch_date, bill_to_address,
      eway_bill_no, invoiceNumber
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    challanNo,
    order_date || '',
    dispatch_date || '',
    bill_to_address || '',
    eway_bill_no || '',
    invoiceNumber || ''
  ], function(err) {
    if (err) {
      console.error("Error creating delivery challan:", err);
      return res.status(500).json({
        error: 'Failed to create delivery challan',
        details: err.message
      });
    }
    
    // Insert items into delivery_items table
    const insertItemQuery = `
      INSERT INTO delivery_items (
        challanNo, item_description, quantity, remarks
      ) VALUES (?, ?, ?, ?)
    `;

    const stmt = db.prepare(insertItemQuery);
    for (const item of items) {
      stmt.run([
        challanNo,
        item.item_description || '',
        item.quantity || 0,
        item.remarks || ''
      ]);
    }
    stmt.finalize();

    res.status(201).json({
      challanNo,
      order_date,
      dispatch_date,
      bill_to_address,
      eway_bill_no,
      invoiceNumber,
      items
    });
  });
});

// Update a delivery challan
app.put("/api/delivery-challans/:challanNo", (req, res) => {
  const { challanNo } = req.params;
  const {
    order_date,
    dispatch_date,
    bill_to_address,
    eway_bill_no,
    invoiceNumber,
    items
  } = req.body;

  if (!challanNo || !order_date || !dispatch_date || !bill_to_address || !eway_bill_no || !invoiceNumber) {
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Challan number, order date, dispatch date, bill to address, eway bill number and invoice number  are required'
    });
  }

  const query = `
    UPDATE delivery_challans SET
      challanNo = ?,
      order_date = ?,
      dispatch_date = ?,
      bill_to_address = ?,
      eway_bill_no = ?,
      invoiceNumber = ?
    WHERE challanNo = ?
  `;

  db.run(query, [
    challanNo,
    order_date || '',
    dispatch_date || '',
    bill_to_address   || '',
    eway_bill_no || '',
    invoiceNumber || '',
    challanNo
  ], function(err) {
    if (err) {
      console.error("Error updating delivery challan:", err);
      return res.status(500).json({
        error: 'Failed to update delivery challan',
        details: err.message
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Delivery challan not found' });
    }

     // Delete all previous items for this challanNo
    db.run("DELETE FROM delivery_items WHERE challanNo = ?", [challanNo], (err) => {
      if (err) {
        console.error("Error deleting old delivery items:", err);
        return res.status(500).json({
          error: 'Failed to update delivery items',
          details: err.message
        });
      }

      // If new items are provided, insert them
      if (Array.isArray(items) && items.length > 0) {
        const insertItemQuery = `
          INSERT INTO delivery_items (
            challanNo, item_description, quantity, remarks
          ) VALUES (?, ?, ?, ?)
        `;
        const stmt = db.prepare(insertItemQuery);
        for (const item of items) {
          stmt.run([
            challanNo,
            item.item_description || '',
            item.quantity || 0,
            item.remarks || ''
          ]);
        }
        stmt.finalize(() => {
          res.json({
            challanNo,
            order_date,
            dispatch_date,
            bill_to_address,
            eway_bill_no,
            invoiceNumber,
            items
          });
        });
      } else {
        res.json({
          challanNo,
          order_date,
          dispatch_date,
          bill_to_address,
          eway_bill_no,
          invoiceNumber,
          items: []
        });
      }
    });
  });
});

// Delete a delivery challan
app.delete("/api/delivery-challans/:challanNo", (req, res) => {
  const { challanNo } = req.params;

  // First, delete items associated with this challanNo
  db.run("DELETE FROM delivery_items WHERE challanNo = ?", [challanNo], function(err) {
    if (err) {
      console.error("Error deleting delivery items:", err);
      return res.status(500).json({
        error: 'Failed to delete delivery items',
        details: err.message
      });
    }

    // Then, delete the challan itself
    db.run("DELETE FROM delivery_challans WHERE challanNo = ?", [challanNo], function(err) {
      if (err) {
        console.error("Error deleting delivery challan:", err);
        return res.status(500).json({
          error: 'Failed to delete delivery challan',
          details: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Delivery challan not found' });
      }
      
      res.json({ 
        message: 'Delivery challan and its items deleted successfully',
        challanNo
      });
    });
  });
});


// Helper Functions
const validatePurchaseData = (data) => {
  const errors = [];
  if (!data.slNo) errors.push('Serial number is required');
  if (!data.date) errors.push('Date is required');
  if (!data.description) errors.push('Description is required');
  
  if (data.credit !== null && isNaN(Number(data.credit))) {
    errors.push('Credit must be a valid number or empty');
  }
  if (data.debit !== null && isNaN(Number(data.debit))) {
    errors.push('Debit must be a valid number or empty');
  }
  
  return errors;
};

function parseCurrency(value) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, ""); // remove ₹, commas, etc.
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}


// Purchases Routes
app.get("/api/purchases", async (req, res) => {
  console.log('Fetching all purchases...');
  
  try {
    // First check if the table exists and has any records
    db.get("SELECT COUNT(*) as count FROM purchases", [], (err, countResult) => {
      if (err) {
        console.error('Error checking purchases table:', err);
        return res.status(500).json({ 
          error: 'Database error',
          details: err.message
        });
      }

      // If no records exist, return a structured response
      if (countResult.count === 0) {
        return res.json({
          data: [],
          metadata: {
            totalCount: 0,
            isEmpty: true,
            message: 'No purchases found in the database'
          }
        });
      }

      // If we have records, fetch them all
      db.all(
        `SELECT * FROM purchases ORDER BY 
          CASE 
            WHEN date IS NULL THEN 1 
            WHEN date = '' THEN 1 
            ELSE 0 
          END,
          date DESC,
          CAST(CASE 
            WHEN slNo GLOB '*[0-9]*' THEN CAST(REPLACE(slNo, '+', '') AS INTEGER)
            ELSE 999999 
          END AS INTEGER)`,
        [],
        (err, rows) => {
          if (err) {
            console.error('Error fetching purchases:', err);
            return res.status(500).json({ 
              error: 'Failed to fetch purchases',
              details: err.message
            });
          }

          const formattedRows = rows.map(row => ({
            ...row,
            credit: parseCurrency(row.credit),
            debit: parseCurrency(row.debit),
            date: row.date || null,
            slNo: row.slNo || '',
            description: row.description || '',
            bankPaymentRef: row.bankPaymentRef || '',
            clientName: row.clientName || '',
            paymentRemarks: row.paymentRemarks || '',
            refBankName: row.refBankName || '',
            invoiceNo: row.invoiceNo || ''
          }));

          console.log(`Fetched ${formattedRows.length} purchases`);
          res.json({
            data: formattedRows,
            metadata: {
              totalCount: formattedRows.length,
              isEmpty: false,
              message: `Successfully fetched ${formattedRows.length} purchases`
            }
          });
        }
      );
    });
  } catch (err) {
    console.error('Unexpected error in /api/purchases:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.post("/api/purchases", (req, res) => {
  const purchaseData = req.body;
  
  const validationErrors = validatePurchaseData(purchaseData);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: validationErrors.join(', ') 
    });pi
  }

  const query = `
    INSERT INTO purchases (
      slNo, date, description, credit, debit,
      bankPaymentRef, clientName, paymentRemarks,
      refBankName, invoiceNo, inputCgst, inputSgst, inputIgst
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      purchaseData.slNo,
      purchaseData.date,
      purchaseData.description,
      purchaseData.credit,
      purchaseData.debit,
      purchaseData.bankPaymentRef || '',
      purchaseData.clientName || '',
      purchaseData.paymentRemarks || '',
      purchaseData.refBankName || '',
      purchaseData.invoiceNo || '',
      purchaseData.inputCgst || 0,
      purchaseData.inputSgst || 0,
      purchaseData.inputIgst || 0
    ],
    function(err) {
      if (err) {
        console.error('Error adding purchase:', err);
        res.status(500).json({ 
          error: 'Failed to add purchase', 
          details: err.message 
        });
        return;
      }
      
      res.status(201).json({
        id: this.lastID,
        message: 'Purchase added successfully',
        purchase: { id: this.lastID, ...purchaseData }
      });
    }
  );
});

app.put("/api/purchases/:id", (req, res) => {
  const { id } = req.params;
  const purchaseData = req.body;

  const validationErrors = validatePurchaseData(purchaseData);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: validationErrors.join(', ') 
    });
  }

  const query = `
    UPDATE purchases SET
      slNo = ?, date = ?, description = ?,
      credit = ?, debit = ?, bankPaymentRef = ?,
      clientName = ?, paymentRemarks = ?,
      refBankName = ?, invoiceNo = ?
    WHERE slNo = ?
  `;

  db.run(
    query,
    [
      purchaseData.slNo,
      purchaseData.date,
      purchaseData.description,
      purchaseData.credit,
      purchaseData.debit,
      purchaseData.bankPaymentRef || '',
      purchaseData.clientName || '',
      purchaseData.paymentRemarks || '',
      purchaseData.refBankName || '',
      purchaseData.invoiceNo || '',
      id
    ],
    function(err) {
      if (err) {
        console.error('Error updating purchase:', err);
        res.status(500).json({ 
          error: 'Failed to update purchase', 
          details: err.message 
        });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Purchase not found' });
        return;
      }
      
      res.json({
        message: 'Purchase updated successfully',
        purchase: { id, ...purchaseData }
      });
    }
  );
});

app.delete("/api/purchases/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM purchases WHERE slNo = ?", [id], function(err) {
    if (err) {
      console.error('Error deleting purchase:', err);
      res.status(500).json({ 
        error: 'Failed to delete purchase', 
        details: err.message 
      });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    res.json({ 
      message: 'Purchase deleted successfully',
      id: id
    });
  });
});

// Invoice Routes
app.get("/api/invoices", (req, res) => {
  db.all("SELECT * FROM invoices ORDER BY invoiceNumber DESC", [], (err, rows) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get("/api/invoices/next-number", (req, res) => {
  const now = new Date();
  let fyStart = now.getFullYear() % 100;
  let fyEnd = (now.getFullYear() + 1) % 100;
  if (now.getMonth() + 1 < 4) {
    fyStart = (now.getFullYear() - 1) % 100;
    fyEnd = now.getFullYear() % 100;
  }
  const fyString = `${fyStart.toString().padStart(2, '0')}-${fyEnd.toString().padStart(2, '0')}`;

  db.get(
    "SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY ROWID DESC LIMIT 1",
    [`VES/${fyString}/%`],
    (err, row) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }
      let nextNumber = 1001;
      if (row && row.invoiceNumber) {
        const match = row.invoiceNumber.match(/VES\/\d{2}-\d{2}\/([0-9]{4})/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const invoiceNumber = `VES/${fyString}/${nextNumber.toString().padStart(4, '0')}`;
      res.json({ invoiceNumber });
    }
  );
});

// Get invoice by ID
app.get("/api/invoices/:invoiceNumber", (req, res) => {
  const invoiceNumber = decodeURIComponent(req.params.invoiceNumber);

  db.get("SELECT * FROM invoices WHERE invoiceNumber = ?", [invoiceNumber], (err, invoice) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    db.all("SELECT * FROM invoice_items WHERE invoiceNumber = ?", [invoiceNumber], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      invoice.items = items;
      res.json(invoice);
    });
  });
});


// Update invoice by ID
app.put("/api/invoices/:invoiceNumber", (req, res) => {
  const invoiceNumber = decodeURIComponent(req.params.invoiceNumber);
  // Prevent changing invoiceNumber in update
  if (req.body.invoiceNumber && req.body.invoiceNumber !== invoiceNumber) {
    return res.status(400).json({ error: "Cannot change invoiceNumber." });
  }
  const { date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode, deliveryAddress_state,
     deliveryDate, deliveryChallanRef, hsnSac, poRefNo, paymentReceived, totalNet, cgst, sgst, igst, grandTotal, amountInWords, paymentDate,
     paymentBank, balanceDue, paymentStatus, items } = req.body;

  db.run(
    "UPDATE invoices SET date = ?, revision = ?, deliveryAddress_name = ?, deliveryAddress_address = ?, deliveryAddress_city = ?, deliveryAddress_postalCode = ?, deliveryAddress_state = ?,deliveryDate = ?, deliveryChallanRef = ?, hsnSac = ?, poRefNo = ?, paymentReceived = ?, totalNet = ?, cgst = ?, sgst = ?, igst = ?, grandTotal = ?, amountInWords = ?, paymentDate = ?, paymentBank = ?, balanceDue = ?, paymentStatus = ? WHERE invoiceNumber = ?",
    [date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode, deliveryAddress_state,
     deliveryDate, deliveryChallanRef, hsnSac, poRefNo, paymentReceived, totalNet, cgst, sgst, igst, grandTotal, amountInWords, paymentDate,
     paymentBank, balanceDue, paymentStatus, invoiceNumber],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Invoice not found" });

      // Update invoice_items: remove old, insert new
      db.run(
        "DELETE FROM invoice_items WHERE invoiceNumber = ?",
        [invoiceNumber],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          if (Array.isArray(items) && items.length > 0) {
            const stmt = db.prepare(
              "INSERT INTO invoice_items (invoiceNumber, item_description, quantity, unitPrice, total) VALUES (?, ?, ?, ?, ?)"
            );
            for (const item of items) {
              stmt.run(invoiceNumber, item.item_description, item.quantity, item.unitPrice, item.total);
            }
            stmt.finalize((err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true });
            });
          } else {
            res.json({ success: true });
          }
        }
      );
    }
  );
});

app.delete("/api/invoices/:invoiceNumber", (req, res) => {
  const invoiceNumber = decodeURIComponent(req.params.invoiceNumber);

  db.run("DELETE FROM invoice_items WHERE invoiceNumber = ?", [invoiceNumber], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.run("DELETE FROM invoices WHERE invoiceNumber = ?", [invoiceNumber], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Dashboard Routes
app.get("/api/dashboard", (req, res) => {
  db.serialize(() => {
    db.get("SELECT COUNT(*) as totalInvoices FROM invoices", (err, totalInvoicesRow) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      db.get("SELECT IFNULL(SUM(grandTotal), 0) as totalRevenue FROM invoices", (err, totalRevenueRow) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        db.get("SELECT IFNULL(SUM(balanceDue), 0) as totalDue FROM invoices WHERE paymentStatus = 'Pending'", (err, totalDueRow) => {
          if (err) {
            console.error("DB ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          db.get("SELECT COUNT(*) as pendingInvoicesCount FROM invoices WHERE paymentStatus = 'Pending'", (err, pendingRow) => {
            if (err) {
              console.error("DB ERROR:", err);
              return res.status(500).json({ error: err.message });
            }

            res.json({
              totalInvoices: totalInvoicesRow.totalInvoices,
              totalRevenue: totalRevenueRow.totalRevenue,
              totalDue: totalDueRow.totalDue,
              pendingInvoicesCount: pendingRow.pendingInvoicesCount
            });
          });
        });
      });
    });
  });
});
app.post("/api/purchases/import", purchaseUpload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: false });
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: "No valid data found" });
    }
    // Insert each row into purchases table
    let inserted = 0;
    for (const row of jsonData) {
      // Skip rows that are completely empty (all main fields are empty)
      if (
        (!row["Sl No"] || row["Sl No"].toString().trim() === "") &&
        (!row["Date"] || row["Date"].toString().trim() === "") &&
        (!row["Description"] || row["Description"].toString().trim() === "") &&
        (!row["Credit"] || row["Credit"].toString().trim() === "") &&
        (!row["Debit"] || row["Debit"].toString().trim() === "") &&
        (!row["Bank Payment Ref"] || row["Bank Payment Ref"].toString().trim() === "") &&
        (!row["Clients Name"] || row["Clients Name"].toString().trim() === "") &&
        (!row["Payment Remarks"] || row["Payment Remarks"].toString().trim() === "") &&
        (!row["Ref Bank Name"] || row["Ref Bank Name"].toString().trim() === "") &&
        (!row["Invoice No"] || row["Invoice No"].toString().trim() === "") &&
        (!row["Input CGST"] || row["Input CGST"].toString().trim() === "") &&
        (!row["Input SGST"] || row["Input SGST"].toString().trim() === "") &&
        (!row["Input IGST"] || row["Input IGST"].toString().trim() === "")
      ) {
        continue; // skip this row
      }
      // Map Excel columns to DB columns explicitly
      const values = [
        row["Sl No"] ?? "",
        row["Date"] ?? "",
        row["Description"] ?? "",
        row["Credit"] ?? null,
        row["Debit"] ?? null,
        (row["Bank Payment Ref"] === null || row["Bank Payment Ref"] === undefined) ? "" : row["Bank Payment Ref"],
        row["Clients Name"] ?? "",
        row["Payment Remarks"] ?? "",
        row["Ref Bank Name"] ?? "",
        row["Invoice No"] ?? "",
        row["Input CGST"] ?? 0,
        row["Input SGST"] ?? 0,
        row["Input IGST"] ?? 0
      ];
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO purchases (slNo, date, description, credit, debit, bankPaymentRef, clientName, paymentRemarks, refBankName, invoiceNo, inputCgst, inputSgst, inputIgst) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          values,
          function (err) {
            if (err) reject(err);
            else { inserted++; resolve(); }
          }
        );
      });
    }
    // Return all purchases
    db.all("SELECT * FROM purchases", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ rows, inserted });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vendors Invoices API ---

// Get all vendor invoices
app.get("/api/vendors-invoices", (req, res) => {
  db.all("SELECT * FROM vendors_invoices ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching vendor invoices:", err);
      return res.status(500).json({ error: "Failed to fetch vendor invoices" });
    }
    res.json(rows);
  });
});

// Add a new vendor invoice
app.post("/api/vendors-invoices", (req, res) => {
  const {
    vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus,
    veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst
  } = req.body;
  db.run(
    `INSERT INTO vendors_invoices (vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus, veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus, veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst],
    function (err) {
      if (err) {
        console.error("Error adding vendor invoice:", err);
        return res.status(500).json({ error: "Failed to add vendor invoice" });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Update a vendor invoice
app.put("/api/vendors-invoices/:id", (req, res) => {
  const { id } = req.params;
  const {
    vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus,
    veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst
  } = req.body;
  db.run(
    `UPDATE vendors_invoices SET vendorName=?, itemName=?, totalInvoiceValue=?, cgst=?, sgst=?, igst=?, paymentStatus=?, veshadInvoiceRefNo=?, veshadInvoiceValue=?, veshadSgst=?, veshadCgst=?, veshadIgst=? WHERE id=?`,
    [vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus, veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst, id],
    function (err) {
      if (err) {
        console.error("Error updating vendor invoice:", err);
        return res.status(500).json({ error: "Failed to update vendor invoice" });
      }
      res.json({ success: true });
    }
  );
});

// Delete one or more vendor invoices
app.delete("/api/vendors-invoices", (req, res) => {
  const { ids } = req.body; // expects { ids: [1,2,3] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No IDs provided for deletion" });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM vendors_invoices WHERE id IN (${placeholders})`, ids, function (err) {
    if (err) {
      console.error("Error deleting vendor invoices:", err);
      return res.status(500).json({ error: "Failed to delete vendor invoices" });
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Import vendor invoices from CSV (expects array of objects)
app.post("/api/vendors-invoices/import", (req, res) => {
  const { data } = req.body; // expects { data: [ {...}, {...} ] }
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: "No data provided for import" });
  }
  const stmt = db.prepare(`INSERT INTO vendors_invoices (vendorName, itemName, totalInvoiceValue, cgst, sgst, igst, paymentStatus, veshadInvoiceRefNo, veshadInvoiceValue, veshadSgst, veshadCgst, veshadIgst) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of data) {
    stmt.run([
      row.vendorName, row.itemName, row.totalInvoiceValue, row.cgst, row.sgst, row.igst, row.paymentStatus,
      row.veshadInvoiceRefNo, row.veshadInvoiceValue, row.veshadSgst, row.veshadCgst, row.veshadIgst
    ]);
  }
  stmt.finalize((err) => {
    if (err) {
      console.error("Error importing vendor invoices:", err);
      return res.status(500).json({ error: "Failed to import vendor invoices" });
    }
    res.json({ success: true });
  });
});
// --- End Vendors Invoices API ---

// --- End points for Letter ---

// Get all letters
app.get("/api/letters", (req, res) => {
  db.all("SELECT * FROM letter ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get a letter by id
app.get("/api/letters/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM letter WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Letter not found" });
    res.json(row);
  });
});

// Update a letter by id
app.put("/api/letters/:id", (req, res) => {
  const { id } = req.params;
  const { date, subject, body } = req.body;
  db.run(
    `UPDATE letter SET date = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [date, subject, body, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Letter not found" });
      res.json({ id, date, subject, body });
    }
  );
});

// Delete a letter by id
app.delete("/api/letters/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM letter WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Letter not found" });
    res.json({ deleted: true, id });
  });
});


// --- End of Lettet End Points ---

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;