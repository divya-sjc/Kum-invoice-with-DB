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
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
dotenv.config();


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

// OAuth session setup
app.use(session({
  secret: process.env.SESSION_SECRET || "your-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,      // from Google Cloud Console
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // You can save user info to DB here if needed
  return done(null, profile);
}));

// Start Google OAuth login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful login, redirect to frontend
    res.redirect('/'); // or your dashboard route
  }
);

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.get("/api/secure-data", ensureAuthenticated, (req, res) => {
  res.json({ secret: "This is protected data!" });
});

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.status(401).json({ error: "Unauthorized" });
}

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

  // Price Comparison table
  db.run(`CREATE TABLE IF NOT EXISTS price_comparison_tables (
    table_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS price_comparison_vendors (
    vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER REFERENCES price_comparison_tables(table_id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    vendor_contact TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS price_comparison_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER REFERENCES price_comparison_tables(table_id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_description TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS price_comparison_quotes (
    quote_id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER REFERENCES price_comparison_tables(table_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES price_comparison_items(item_id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES price_comparison_vendors(vendor_id) ON DELETE CASCADE,
    price REAL DEFAULT 0
  )`);

  // Purchases table
  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    slNo TEXT,
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
    veshadCgst REAL DEFAULT 0,
    veshadSgst REAL DEFAULT 0,
    veshadIgst REAL DEFAULT 0,
    grandTotal REAL DEFAULT 0,
    amountInWords TEXT DEFAULT "",
    paymentReceived REAL DEFAULT 0,
    paymentBank TEXT DEFAULT "",
    paymentBankRef TEXT DEFAULT "",
    paymentDate TEXT DEFAULT "",
    balanceDue REAL DEFAULT 0,
    paymentStatus TEXT DEFAULT "Pending",
    notes TEXT DEFAULT "",
    vendor_id INTEGER,
    profitPercent REAL DEFAULT 0
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
    vinvoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT (date('now')),
    vendor_id INTEGER REFERENCES vendor_names(vendor_id),
    total_quantity INTEGER DEFAULT 0,
    totalInvoiceValue REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    paymentStatus TEXT DEFAULT 'Pending',
    paymentDate TEXT DEFAULT '',
    veshadInvoiceRefNo TEXT
  )`);

  // Vendors names table
  db.run(`CREATE TABLE IF NOT EXISTS vendor_names (
    vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT (date('now')),
    vendorName TEXT,
    contactDetails TEXT DEFAULT ''
  )`);

  // Vendors items table
  db.run(`CREATE TABLE IF NOT EXISTS vendor_items (
    vitem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemName TEXT,
    pricePerUnit REAL DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    total REAL DEFAULT 0,
    vendor_id TEXT REFERENCES vendor_names(vendor_id),
    vinvoice_id INTEGER REFERENCES vendors_invoices(vinvoice_id)
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challanNo TEXT,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  remarks TEXT,
  FOREIGN KEY (challanNo) REFERENCES delivery_challans(challanNo)
)`);

  // letters table
  db.run(`CREATE TABLE IF NOT EXISTS letter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    "to" TEXT,
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

// veshad GST Routes
app.get("/api/gst-collected", (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ error: "Month is required (format: yyyy-MM)" });
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`;
  
  db.get(
    `SELECT 
      IFNULL(SUM(veshadCgst), 0) as veshadCgst, 
      IFNULL(SUM(veshadSgst), 0) as veshadSgst, 
      IFNULL(SUM(veshadIgst), 0) as veshadIgst 
    FROM invoices 
    WHERE date(date) >= date(?) AND date(date) <= date(?)`,
    [startDate, endDate],
    (err, row) => {
      if (err) {
        console.error("GST summary error:", err);
        return res.status(500).json({ error: "Failed to fetch GST summary" });
      }
      res.json({
        veshadCgst: row.veshadCgst || 0,
        veshadSgst: row.veshadSgst || 0,
        veshadIgst: row.veshadIgst || 0
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
      IFNULL(SUM(veshadCgst), 0) as veshadCgst, 
      IFNULL(SUM(veshadSgst), 0) as veshadSgst, 
      IFNULL(SUM(veshadIgst), 0) as veshadIgst 
    FROM invoices 
    WHERE date(date) >= date(?) AND date(date) <= date(?)`,
    [fyStart, fyEnd],
    (err, row) => {
      if (err) {
        console.error("GST FY summary error:", err);
        return res.status(500).json({ error: "Failed to fetch GST FY summary" });
      }
      res.json({
        veshadCgst: row.veshadCgst || 0,
        veshadSgst: row.veshadSgst || 0,
        veshadIgst: row.veshadIgst || 0
      });
    }
  );
});

// Gst collected route 
app.get("/api/vendor/gst-collected", (req, res) => {
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
    FROM vendors_invoices 
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

app.get("/api/vendor/gst-collected-fy", (req, res) => {
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
    FROM vendors_invoices 
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
    // Fetch items from delivery_items table for this challanNo
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

// Purchase APIs
// get the highest slNo from purchases
app.get("/api/purchases/max-slno", (req, res) => {
  db.get("SELECT MAX(CAST(slNo AS INTEGER)) as maxSlNo FROM purchases", [], (err, row) => {
    if (err) {
      console.error("Error fetching max slNo:", err);
      return res.status(500).json({ error: "Failed to fetch max slNo", details: err.message });
    }
    res.json({ maxSlNo: row?.maxSlNo || 0 });
  });
});


//  Get all purchases from the database
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
            credit: row.credit === null ? null : Number(row.credit),
            debit: row.debit === null ? null : Number(row.debit),
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
      date = ?, description = ?,
      credit = ?, debit = ?, bankPaymentRef = ?,
      clientName = ?, paymentRemarks = ?,
      refBankName = ?, invoiceNo = ?,
      inputCgst = ?, inputSgst = ?, inputIgst = ?
    WHERE slNo = ?
  `;

  db.run(
    query,
    [
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
      purchaseData.inputIgst || 0,
      purchaseData.slNo,
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
  const { date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode,
    deliveryAddress_state, deliveryDate, deliveryChallanRef, hsnSac, poRefNo, ewayBillRef, invoiceTotal, totalNet, veshadCgst, veshadSgst,
    veshadIgst, grandTotal, amountInWords, paymentReceived, paymentBank, paymentBankRef, paymentDate, balanceDue, paymentStatus, notes,
    vendor_id, profitPercent, items } = req.body;

  if (Array.isArray(vendor_id)) {
    vendor_id = vendor_id.join(",");
  }

  db.run(
    "UPDATE invoices SET date=?, revision=?, deliveryAddress_name=?, deliveryAddress_address=?, deliveryAddress_city=?, deliveryAddress_postalCode=?, deliveryAddress_state=?, deliveryDate=?, deliveryChallanRef=?, hsnSac=?, poRefNo=?, ewayBillRef=?, invoiceTotal=?, totalNet=?, veshadCgst=?, veshadSgst=?, veshadIgst=?, grandTotal=?, amountInWords=?, paymentReceived=?, paymentBank=?, paymentBankRef=?, paymentDate=?, balanceDue=?, paymentStatus=?, notes=?, vendor_id=?, profitPercent=? WHERE invoiceNumber = ?",
    [date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode,
    deliveryAddress_state, deliveryDate, deliveryChallanRef, hsnSac, poRefNo, ewayBillRef, invoiceTotal, totalNet, veshadCgst, veshadSgst,
    veshadIgst, grandTotal, amountInWords, paymentReceived, paymentBank, paymentBankRef, paymentDate, balanceDue, paymentStatus, notes,
    vendor_id, profitPercent, invoiceNumber],
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


app.post("/api/purchases/import", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      details: 'Please select an Excel file to upload'
    });
  }

  try {
    console.log('Processing uploaded file:', req.file.originalname);
    
    // Read the Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with proper headers
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null
    });

    if (jsonData.length === 0) {
      return res.status(400).json({ 
        error: 'Empty file',
        details: 'The uploaded Excel file appears to be empty'
      });
    }

    // Assume first row contains headers
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    console.log('Headers found:', headers);
    console.log(`Processing ${dataRows.length} data rows`);

    // Map headers to database columns (flexible mapping)
    const columnMapping = {
      'slNo': ['slno', 'sl no', 'serial no', 'sno', 'sr no', 'serial', 'sl.no', 's.no'],
      'date': ['date', 'transaction date', 'trans date', 'txn date', 'tran date'],
      'description': ['description', 'details', 'particulars', 'narration', 'desc', 'transaction details'],
      'credit': ['credit', 'credit amount', 'cr', 'deposit', 'cr amt', 'credit amt'],
      'debit': ['debit', 'debit amount', 'dr', 'withdrawal', 'dr amt', 'debit amt'],
      'bankPaymentRef': ['bank payment ref', 'payment ref', 'ref no', 'reference', 'ref', 'payment reference', 'bank ref'],
      'clientName': ['client name', 'customer name', 'party name', 'client', 'customer', 'party'],
      'paymentRemarks': ['payment remarks', 'remarks', 'notes', 'comments', 'remark'],
      'refBankName': ['ref bank name', 'Ref Bank Name'], // Only allow exact matches for Ref Bank Name
      'invoiceNo': ['invoice no', 'invoice number', 'inv no', 'invoice', 'inv'],
      'inputCgst': ['input cgst', 'cgst', 'cgst amount', 'cgst amt', 'i cgst'],
      'inputSgst': ['input sgst', 'sgst', 'sgst amount', 'sgst amt', 'i sgst'],
      'inputIgst': ['input igst', 'igst', 'igst amount', 'igst amt', 'i igst']
    };

    // Find column indices
    const columnIndices = {};
    for (const [dbColumn, possibleNames] of Object.entries(columnMapping)) {
      const headerIndex = headers.findIndex(header => 
        possibleNames.some(name => 
          header && header.toString().toLowerCase().includes(name.toLowerCase())
        )
      );
      if (headerIndex !== -1) {
        columnIndices[dbColumn] = headerIndex;
      }
    }

    console.log('Column mapping:', columnIndices);

    const validRows = [];
    const errors = [];

    // Process each data row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // +2 because we skip header and Excel is 1-indexed

      try {
        // Skip empty rows - check if all cells are empty/null/undefined
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '' || cell === 0)) {
          continue;
        }

        // Clean and parse credit value
        let rawCredit = columnIndices.credit !== undefined ? row[columnIndices.credit] : null;
        let creditValue = null;
        if (rawCredit !== null && rawCredit !== undefined && rawCredit !== '') {
          // Remove commas, currency symbols, and trim
          const cleaned = rawCredit.toString().replace(/[^0-9.\-]/g, '').trim();
          creditValue = cleaned ? parseFloat(cleaned) : null;
          if (isNaN(creditValue)) {
            console.warn(`Row ${rowNum}: Could not parse credit value:`, rawCredit);
            creditValue = null;
          }
        }
        // Clean and parse debit value
        let rawDebit = columnIndices.debit !== undefined ? row[columnIndices.debit] : null;
        let debitValue = null;
        if (rawDebit !== null && rawDebit !== undefined && rawDebit !== '') {
          const cleaned = rawDebit.toString().replace(/[^0-9.\-]/g, '').trim();
          debitValue = cleaned ? parseFloat(cleaned) : null;
          if (isNaN(debitValue)) {
            console.warn(`Row ${rowNum}: Could not parse debit value:`, rawDebit);
            debitValue = null;
          }
        }
        const purchase = {
          slNo: columnIndices.slNo !== undefined ? (row[columnIndices.slNo] || '').toString().trim() : '',
          date: columnIndices.date !== undefined ? row[columnIndices.date] : '',
          description: columnIndices.description !== undefined ? (row[columnIndices.description] || '').toString().trim() : '',
          credit: creditValue,
          debit: debitValue,
          bankPaymentRef: columnIndices.bankPaymentRef !== undefined ? (row[columnIndices.bankPaymentRef] || '').toString().trim() : '',
          clientName: columnIndices.clientName !== undefined ? (row[columnIndices.clientName] || '').toString().trim() : '',
          paymentRemarks: columnIndices.paymentRemarks !== undefined ? (row[columnIndices.paymentRemarks] || '').toString().trim() : '',
          refBankName: columnIndices.refBankName !== undefined ? (row[columnIndices.refBankName] || '').toString().trim() : '',
          invoiceNo: columnIndices.invoiceNo !== undefined ? (row[columnIndices.invoiceNo] || '').toString().trim() : '',
          inputCgst: columnIndices.inputCgst !== undefined ? parseFloat(row[columnIndices.inputCgst]) || 0 : 0,
          inputSgst: columnIndices.inputSgst !== undefined ? parseFloat(row[columnIndices.inputSgst]) || 0 : 0,
          inputIgst: columnIndices.inputIgst !== undefined ? parseFloat(row[columnIndices.inputIgst]) || 0 : 0
        };

        // Convert Excel date if needed
        if (purchase.date && typeof purchase.date === 'number') {
          const excelDate = new Date((purchase.date - 25569) * 86400 * 1000);
          purchase.date = excelDate.toISOString().split('T')[0];
        } else if (purchase.date) {
          // Try to parse various date formats
          const dateObj = new Date(purchase.date);
          if (!isNaN(dateObj.getTime())) {
            purchase.date = dateObj.toISOString().split('T')[0];
          }
        }

        // More flexible validation - check if row has meaningful transaction data
        const hasTransactionData = purchase.credit || purchase.debit || purchase.description || purchase.bankPaymentRef || purchase.clientName;
        
        if (!hasTransactionData) {
          // Skip completely empty rows without generating errors
          console.log(`Skipping empty row ${rowNum}: No meaningful transaction data`);
          continue;
        }

        console.log(`Processing row ${rowNum}:`, {
          slNo: purchase.slNo,
          date: purchase.date,
          description: purchase.description?.substring(0, 30) + '...',
          credit: purchase.credit,
          debit: purchase.debit
        });

        validRows.push(purchase);
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    console.log(`Processed ${validRows.length} valid rows, ${errors.length} errors`);

    if (validRows.length === 0) {
      return res.status(400).json({
        error: 'No valid data found',
        details: errors.length > 0 ? errors : ['No valid purchase data found in the file']
      });
    }

    // Insert valid rows into database, skipping duplicates (by slNo, date, description)
    const insertQuery = `
      INSERT INTO purchases (
        slNo, date, description, credit, debit,
        bankPaymentRef, clientName, paymentRemarks,
        refBankName, invoiceNo, inputCgst, inputSgst, inputIgst
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let insertedCount = 0;
    const insertErrors = [];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      let processed = 0;
      for (let i = 0; i < validRows.length; i++) {
        const purchase = validRows[i];
        // Check for duplicate by slNo, date, and description
        db.get(
          `SELECT slNo, date, description FROM purchases WHERE slNo = ? AND date = ? AND description = ?`,
          [purchase.slNo, purchase.date, purchase.description],
          (err, row) => {
            if (err) {
              insertErrors.push(`Failed to check duplicate for row ${i + 1}: ${err.message}`);
              processed++;
              if (processed === validRows.length) {
                finalizeImport();
              }
              return;
            }
            if (row) {
              // Duplicate found, skip insert
              processed++;
              if (processed === validRows.length) {
                finalizeImport();
              }
              return;
            }
            // No duplicate, insert
            db.run(
              insertQuery,
              [
                purchase.slNo,
                purchase.date,
                purchase.description,
                purchase.credit,
                purchase.debit,
                purchase.bankPaymentRef,
                purchase.clientName,
                purchase.paymentRemarks,
                purchase.refBankName,
                purchase.invoiceNo,
                purchase.inputCgst,
                purchase.inputSgst,
                purchase.inputIgst
              ],
              (err) => {
                if (err) {
                  insertErrors.push(`Failed to insert row ${i + 1}: ${err.message}`);
                } else {
                  insertedCount++;
                }
                processed++;
                if (processed === validRows.length) {
                  finalizeImport();
                }
              }
            );
          }
        );
      }

      function finalizeImport() {
        if (insertErrors.length > 0) {
          db.run("ROLLBACK", (rollbackErr) => {
            res.status(500).json({
              error: 'Failed to import data',
              details: insertErrors,
              inserted: insertedCount,
              total: validRows.length
            });
          });
        } else {
          db.run("COMMIT", (commitErr) => {
            if (commitErr) {
              res.status(500).json({
                error: 'Failed to commit transaction',
                details: commitErr.message
              });
            } else {
              res.json({
                message: 'Import completed successfully',
                inserted: insertedCount,
                total: validRows.length,
                errors: errors.length > 0 ? errors : undefined
              });
            }
          });
        }
      }
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({
      error: 'Failed to process uploaded file',
      details: error.message
    });
  } finally {
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
});

// Create new invoice
app.post("/api/invoices", (req, res) => {
  console.log('Creating new invoice with data:', JSON.stringify(req.body, null, 2));
  
  const {
    invoiceNumber,  date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode,
    deliveryAddress_state, deliveryDate, deliveryChallanRef, hsnSac, poRefNo, ewayBillRef, invoiceTotal, totalNet, veshadCgst, veshadSgst,
    veshadIgst, grandTotal, amountInWords, paymentReceived, paymentBank, paymentBankRef, paymentDate, balanceDue, paymentStatus, notes,
    vendor_id, profitPercent, items
  } = req.body;

  // Basic validation
  if (!invoiceNumber || !date || !grandTotal) {
    return res.status(400).json({ 
      error: "Missing required fields",
      details: "Invoice number, date, and grand total are required"
    });
  }

  // Check if invoice number already exists
  db.get("SELECT invoiceNumber FROM invoices WHERE invoiceNumber = ?", [invoiceNumber], (err, existingInvoice) => {
    if (err) {
      console.error("Error checking existing invoice:", err);
      return res.status(500).json({ error: err.message });
    }

    if (existingInvoice) {
      return res.status(409).json({ 
        error: "Invoice already exists",
        details: `Invoice with number ${invoiceNumber} already exists`
      });
    }
    let vendor_id = req.body.vendor_id;
    if (Array.isArray(vendor_id)) {
      vendor_id = vendor_id.join(","); // store as "1,2,5"
    }

    // Insert the invoice - only using columns that exist in the table
    const insertInvoiceQuery = `
      INSERT INTO invoices (
        invoiceNumber,  date, revision, deliveryAddress_name, deliveryAddress_address, deliveryAddress_city, deliveryAddress_postalCode,
        deliveryAddress_state, deliveryDate, deliveryChallanRef, hsnSac, poRefNo, ewayBillRef, invoiceTotal, totalNet, veshadCgst, veshadSgst,
        veshadIgst, grandTotal, amountInWords, paymentReceived, paymentBank, paymentBankRef, paymentDate, balanceDue, paymentStatus, notes,
        vendor_id, profitPercent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertInvoiceQuery,
      [
        invoiceNumber, date, revision || 1, deliveryAddress_name || '', 
        deliveryAddress_address || '', deliveryAddress_city || '', 
        deliveryAddress_postalCode || '', deliveryAddress_state || '',
        deliveryDate || '', deliveryChallanRef || '', hsnSac || '', poRefNo || '', ewayBillRef || '',
        invoiceTotal || 0, totalNet || 0, veshadCgst || 0, veshadSgst || 0, veshadIgst || 0, 
        grandTotal || 0, amountInWords || '', paymentReceived || 0, paymentBank || '', paymentBankRef || '',
        paymentDate || '', balanceDue || grandTotal, paymentStatus || 'Pending', 
        notes || '',  vendor_id || null, profitPercent || 0
      ],
      function (err) {
        if (err) {
          console.error("Error inserting invoice:", err);
          return res.status(500).json({ 
            error: "Failed to create invoice",
            details: err.message 
          });
        }

        console.log(`Invoice ${invoiceNumber} created successfully`);

        // Insert invoice items if provided
        if (Array.isArray(items) && items.length > 0) {
          const stmt = db.prepare(
            "INSERT INTO invoice_items (invoiceNumber, item_description, quantity, unitPrice, total) VALUES (?, ?, ?, ?, ?)"
          );
          
          let itemErrors = [];
          let itemsProcessed = 0;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            stmt.run(
              invoiceNumber, 
              item.item_description || '', 
              item.quantity || 0, 
              item.unitPrice || 0, 
              item.total || 0,
              function(err) {
                itemsProcessed++;
                if (err) {
                  console.error(`Error inserting item ${i + 1}:`, err);
                  itemErrors.push(`Item ${i + 1}: ${err.message}`);
                }

                // Check if all items have been processed
                if (itemsProcessed === items.length) {
                  stmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                      console.error("Error finalizing statement:", finalizeErr);
                    }

                    if (itemErrors.length > 0) {
                      return res.status(500).json({
                        error: "Invoice created but some items failed to save",
                        details: itemErrors,
                        invoiceNumber: invoiceNumber
                      });
                    }

                    res.status(201).json({
                      success: true,
                      message: "Invoice created successfully",
                      invoiceNumber: invoiceNumber,
                      itemsCount: items.length
                    });
                  });
                }
              }
            );
          }
        } else {
          // No items to insert
          res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            invoiceNumber: invoiceNumber,
            itemsCount: 0
          });
        }
      }
    );
  });
});

// Bulk save purchases
app.post("/api/purchases/bulk-save", async (req, res) => {
  const purchases = req.body.purchases;
  if (!Array.isArray(purchases) || purchases.length === 0) {
    return res.status(400).json({ error: "No purchases provided" });
  }
  const insertQuery = `
    INSERT INTO purchases (
      slNo, date, description, credit, debit,
      bankPaymentRef, clientName, paymentRemarks,
      refBankName, invoiceNo, inputCgst, inputSgst, inputIgst
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const updateQuery = `
    UPDATE purchases SET
      credit = ?, debit = ?, bankPaymentRef = ?, clientName = ?, paymentRemarks = ?,
      refBankName = ?, invoiceNo = ?, inputCgst = ?, inputSgst = ?, inputIgst = ?
    WHERE slNo = ? AND date = ? AND description = ?
  `;
  let insertedCount = 0;
  let updatedCount = 0;
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    for (const purchase of purchases) {
      db.get(
        "SELECT id FROM purchases WHERE slNo = ? AND date = ? AND description = ?",
        [purchase.slNo, purchase.date, purchase.description],
        (err, row) => {
          if (row) {
            db.run(
              updateQuery,
              [
                purchase.credit,
                purchase.debit,
                purchase.bankPaymentRef,
                purchase.clientName,
                purchase.paymentRemarks,
                purchase.refBankName,
                purchase.invoiceNo,
                purchase.inputCgst,
                purchase.inputSgst,
                purchase.inputIgst,
                purchase.slNo,
                purchase.date,
                purchase.description
              ],
              function (err) {
                if (!err) updatedCount++;
              }
            );
          } else {
            db.run(
              insertQuery,
              [
                purchase.slNo,
                purchase.date,
                purchase.description,
                purchase.credit,
                purchase.debit,
                purchase.bankPaymentRef,
                purchase.clientName,
                purchase.paymentRemarks,
                purchase.refBankName,
                purchase.invoiceNo,
                purchase.inputCgst,
                purchase.inputSgst,
                purchase.inputIgst
              ],
              function (err) {
                if (!err) insertedCount++;
              }
            );
          }
        }
      );
    }
    db.run("COMMIT", () => {
      res.json({ success: true, insertedCount, updatedCount });
    });
  });
});

// --- Vendors Invoices API ---

// Get all vendor invoices
app.get("/api/vendors-invoices", (req, res) => {
  db.all("SELECT * FROM vendors_invoices ORDER BY vinvoice_id DESC", [], (err, rows) => {
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
    date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo
  } = req.body;
  db.run(
    `INSERT INTO vendors_invoices (date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo],
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
    date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo
  } = req.body;
  db.run(
    `UPDATE vendors_invoices SET date=?, vendor_id=?, total_quantity=?, totalInvoiceValue=?, cgst=?, sgst=?, igst=?, paymentStatus=?, paymentDate=?, veshadInvoiceRefNo=? WHERE vinvoice_id=?`,
    [date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo, id],
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
  db.run(`DELETE FROM vendors_invoices WHERE vinvoice_id IN (${placeholders})`, ids, function (err) {
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
  const stmt = db.prepare(`INSERT INTO vendors_invoices (date, vendor_id, total_quantity, totalInvoiceValue, cgst, sgst, igst, paymentStatus, paymentDate, veshadInvoiceRefNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of data) {
    // Convert Excel serial date to YYYY-MM-DD if needed
    if (row.date && typeof row.date === 'number') {
      const excelDate = new Date((row.date - 25569) * 86400 * 1000);
      row.date = excelDate.toISOString().split('T')[0];
    }
    stmt.run([
      row.date, row.vendor_id, row.total_quantity, row.totalInvoiceValue, row.cgst, row.sgst, row.igst, row.paymentStatus, row.paymentDate, row.veshadInvoiceRefNo
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

// --- Vendor names API ---

// Get all vendor names
app.get("/api/vendor-names", (req, res) => {
  db.all("SELECT * FROM vendor_names ORDER BY date DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching vendor invoices:", err);
      return res.status(500).json({ error: "Failed to fetch vendor invoices" });
    }
    res.json(rows);
  });
});

// Add a new vendor names
app.post("/api/vendor-names", (req, res) => {
  const {
    date, vendorName, contactDetails
  } = req.body;
  db.run(
    `INSERT INTO vendor_names (date, vendorName, contactDetails)
     VALUES (?, ?, ?)`,
    [date, vendorName, contactDetails],
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
app.put("/api/vendor-names/:id", (req, res) => {
  const { id } = req.params;
  const {
    date, vendorName, contactDetails
  } = req.body;
  db.run(
    `UPDATE vendor_names SET date=?, vendorName=?, contactDetails=? WHERE vendor_id=?`,
    [date, vendorName, contactDetails, id],
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
app.delete("/api/vendor-names", (req, res) => {
  const { ids } = req.body; // expects { ids: [1,2,3] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No IDs provided for deletion" });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM vendor_names WHERE vendor_id IN (${placeholders})`, ids, function (err) {
    if (err) {
      console.error("Error deleting vendor invoices:", err);
      return res.status(500).json({ error: "Failed to delete vendor invoices" });
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Get vendor_id by vendorName
app.get("/api/vendor-names/by-name", (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: "Missing vendor name in query" });
  }
  db.get(
    "SELECT vendor_id, vendorName FROM vendor_names WHERE vendorName = ?",
    [name],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(row);
    }
  );
});

// Get vendor_id by vendor_id from vendorName
app.get("/api/vendor-names/by-id", (req, res) => {
  const { id } = req.query; // could be "1,2,5"
  if (!id) {
    return res.status(400).json({ error: "Missing vendor id in query" });
  }

  // split into array
  const ids = id.toString().split(",").map(Number).filter(Boolean);

  const placeholders = ids.map(() => "?").join(",");
  const query = `SELECT vendor_id, vendorName FROM vendor_names WHERE vendor_id IN (${placeholders})`;

  db.all(query, ids, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Vendors not found" });
    }
    res.json(rows);
  });
});

// --- End of Vendor Name ---

// --- Vendor items API ---

// Get all vendor items
app.get("/api/vendor-items", (req, res) => {
  db.all("SELECT * FROM vendor_items ORDER BY vitem_id DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching vendor invoices:", err);
      return res.status(500).json({ error: "Failed to fetch vendor invoices" });
    }
    res.json(rows);
  });
});

// Get all vendor items with one or more vendor_ids
app.get("/api/vendor-items/vendor/:vid", (req, res) => {
  const vid = req.params.vid; // could be "3" or "1,2,5"
  if (!vid) {
    return res.status(400).json({ error: "Missing vendor_id(s)" });
  }
  // split into array
  const vendorIds = vid.split(",").map(id => parseInt(id)).filter(Boolean);
  if (vendorIds.length === 0) {
    return res.json([]);
  }
  // build placeholders (?, ?, ?)
  const placeholders = vendorIds.map(() => "?").join(",");
  const query = `SELECT * FROM vendor_items WHERE vendor_id IN (${placeholders})`;
  db.all(query, vendorIds, (err, rows) => {
    if (err) {
      console.error("Error fetching vendor items:", err);
      return res.status(500).json({ error: "Failed to fetch vendor items" });
    }
    res.json(rows);
  });
});


// Get all vendor items with given invoice no
app.get("/api/vendor-items/:id", (req, res) => {
  db.all("SELECT * FROM vendor_items where vinvoice_id=?", [id], (err, rows) => {
    if (err) {
      console.error("Error fetching vendor invoices:", err);
      return res.status(500).json({ error: "Failed to fetch vendor invoices" });
    }
    res.json(rows);
  });
});

// Add a new vendor names
app.post("/api/vendor-items", (req, res) => {
  const {
    itemName, pricePerUnit, quantity, total, vendor_id, vinvoice_id
  } = req.body;
  db.run(
    `INSERT INTO vendor_items (itemName, pricePerUnit, quantity, total, vendor_id, vinvoice_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [itemName, pricePerUnit, quantity, total, vendor_id, vinvoice_id],
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
app.put("/api/vendor-items/:id", (req, res) => {
  const { id } = req.params;
  const {
    itemName, pricePerUnit, quantity, total, vendor_id, vinvoice_id
  } = req.body;
  db.run(
    `UPDATE vendor_items SET itemName=?, pricePerUnit=?, quantity=?, total=?, vendor_id=?, vinvoice_id=? WHERE vitem_id=?`,
    [itemName, pricePerUnit, quantity, total, vendor_id, vinvoice_id, id],
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
app.delete("/api/vendor-items", (req, res) => {
  // Support deleting all items for a given vinvoice_id via query param
  const vinvoice_id = req.query.vinvoice_id;
  if (vinvoice_id) {
    db.run("DELETE FROM vendor_items WHERE vinvoice_id = ?", [vinvoice_id], function (err) {
      if (err) {
        console.error("Error deleting vendor items by vinvoice_id:", err);
        return res.status(500).json({ error: "Failed to delete vendor items for invoice" });
      }
      return res.json({ success: true, deleted: this.changes });
    });
    return;
  }
  // Fallback: delete by array of vitem_id
  const { ids } = req.body; // expects { ids: [1,2,3] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No IDs provided for deletion" });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM vendor_items WHERE vitem_id IN (${placeholders})`, ids, function (err) {
    if (err) {
      console.error("Error deleting vendor invoices:", err);
      return res.status(500).json({ error: "Failed to delete vendor invoices" });
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// --- End of Vendor Items ---

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

// post a new letter
app.post("/api/letters", (req, res) => {
  const { date, to, subject, body } = req.body;
  if (!date || !subject || !body) {
    return res.status(400).json({ error: "Date, subject and body are required" });
  }
  db.run(
    `INSERT INTO letter (date, "to", subject, body, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [date, to, subject, body],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, date, to, subject, body });
    }
  );
});

// Update a letter by id
app.put("/api/letters/:id", (req, res) => {
  const { id } = req.params;
  const { date, to, subject, body } = req.body;
  db.run(
    `UPDATE letter SET date = ?, "to" = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [date, to, subject, body, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Letter not found" });
      res.json({ id, date, to, subject, body });
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


// --- End points for price comparison ---

// 1. Get all tables (latest first)
app.get("/api/price-comparison/tables", (req, res) => {
  db.all(`SELECT * FROM price_comparison_tables ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error("Error fetching tables:", err);
      return res.status(500).json({ error: "Failed to fetch tables" });
    }
    res.json(rows);
  });
});

// 2. Get full details of a table (vendors, items, quotes)
app.get("/api/price-comparison/tables/:id", (req, res) => {
  const tableId = req.params.id;

  const result = { vendors: [], items: [], quotes: [] };

  db.all(`SELECT * FROM price_comparison_vendors WHERE table_id = ?`, [tableId], (err, vendors) => {
    if (err) return res.status(500).json({ error: err.message });
    result.vendors = vendors;

    db.all(`SELECT * FROM price_comparison_items WHERE table_id = ?`, [tableId], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      result.items = items;

      db.all(`SELECT * FROM price_comparison_quotes WHERE table_id = ?`, [tableId], (err, quotes) => {
        if (err) return res.status(500).json({ error: err.message });
        result.quotes = quotes;

        res.json(result);
      });
    });
  });
});


// 3. Create a new table
app.post("/api/price-comparison/tables", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  db.run(`INSERT INTO price_comparison_tables (title) VALUES (?)`, [title], function (err) {
    if (err) {
      console.error("Error creating table:", err);
      return res.status(500).json({ error: "Failed to create table" });
    }
    res.status(201).json({ table_id: this.lastID, title });
  });
});


// 4. Add vendors to a table
app.post("/api/price-comparison/:id/vendors", (req, res) => {
  const tableId = req.params.id;
  const vendors = req.body; // expect array [{vendor_name:"..."}]

  const stmt = db.prepare(`INSERT INTO price_comparison_vendors (table_id, vendor_name, vendor_contact) VALUES (?, ?, ?)`);

  vendors.forEach(v => {
    stmt.run([tableId, v.vendor_name, v.vendor_contact || null]);
  });

  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Vendors added successfully" });
  });
});


// 5. Add items to a table
app.post("/api/price-comparison/:id/items", (req, res) => {
  const tableId = req.params.id;
  const items = req.body; // expect array [{item_name:"..."}]

  const stmt = db.prepare(`INSERT INTO price_comparison_items (table_id, item_name, item_description) VALUES (?, ?, ?)`);

  items.forEach(i => {
    stmt.run([tableId, i.item_name, i.item_description || null]);
  });

  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Items added successfully" });
  });
});


// 6. Save or update a quote
app.post("/api/price-comparison/:id/quotes", (req, res) => {
  const tableId = req.params.id;
  const { item_id, vendor_id, price } = req.body;

  // check if already exists
  db.get(
    `SELECT * FROM price_comparison_quotes WHERE table_id = ? AND item_id = ? AND vendor_id = ?`,
    [tableId, item_id, vendor_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        // update
        db.run(
          `UPDATE price_comparison_quotes SET price = ? WHERE quote_id = ?`,
          [price, row.quote_id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Quote updated", quote_id: row.quote_id, price });
          }
        );
      } else {
        // insert
        db.run(
          `INSERT INTO price_comparison_quotes (table_id, item_id, vendor_id, price) VALUES (?, ?, ?, ?)`,
          [tableId, item_id, vendor_id, price],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Quote inserted", quote_id: this.lastID, price });
          }
        );
      }
    }
  );
});

// delete a price comparison table and all related data
app.delete("/api/price-comparison/tables/:id", (req, res) => {
  const tableId = req.params.id;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run(
      `DELETE FROM price_comparison_quotes 
       WHERE item_id IN (SELECT item_id FROM price_comparison_items WHERE table_id = ?)
          OR vendor_id IN (SELECT vendor_id FROM price_comparison_vendors WHERE table_id = ?)`,
      [tableId, tableId],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          console.error("Error deleting quotes:", err);
          return res.status(500).json({ error: err.message });
        }
        db.run(
          `DELETE FROM price_comparison_items WHERE table_id = ?`,
          [tableId],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              console.error("Error deleting items:", err);
              return res.status(500).json({ error: err.message });
            }
            db.run(
              `DELETE FROM price_comparison_vendors WHERE table_id = ?`,
              [tableId],
              function (err) {
                if (err) {
                  db.run("ROLLBACK");
                  console.error("Error deleting vendors:", err);
                  return res.status(500).json({ error: err.message });
                }
                db.run(
                  `DELETE FROM price_comparison_tables WHERE table_id = ?`,
                  [tableId],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      console.error("Error deleting table:", err);
                      return res.status(500).json({ error: err.message });
                    }
                    db.run("COMMIT");
                    res.json({ message: "Table and all related data deleted", changes: this.changes });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Delete a vendor
app.delete("/api/price-comparison/vendors/:id", (req, res) => {
  db.run(`DELETE FROM price_comparison_vendors WHERE vendor_id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Vendor deleted", changes: this.changes });
  });
});

// Delete an item
app.delete("/api/price-comparison/items/:id", (req, res) => {
  db.run(`DELETE FROM price_comparison_items WHERE item_id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Item deleted", changes: this.changes });
  });
});

// --- End of price comparison End Points ---

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});