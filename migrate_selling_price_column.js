import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Wait a bit to ensure all connections are closed
setTimeout(() => {
  console.log('Starting database schema update...');
  
  const db = new sqlite3.Database('./invoices.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('Database opened successfully');
  });

  // Enable WAL mode to reduce locking
  db.run("PRAGMA journal_mode=WAL", (err) => {
    if (err) {
      console.error('Error setting WAL mode:', err);
    }
  });

  console.log('Checking current schema...');

  // First, check if the column exists
  db.all("PRAGMA table_info(consolidated)", [], (err, columns) => {
    if (err) {
      console.error('Error checking schema:', err);
      db.close();
      return;
    }
    
    console.log('Current columns in consolidated table:');
    columns.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
    
    // Check if selling_price exists and selling_price_per_pc doesn't
    const hasSellingPrice = columns.some(col => col.name === 'selling_price');
    const hasSellingPricePerPc = columns.some(col => col.name === 'selling_price_per_pc');
    
    console.log(`\nColumn status:`);
    console.log(`- selling_price exists: ${hasSellingPrice}`);
    console.log(`- selling_price_per_pc exists: ${hasSellingPricePerPc}`);
    
    if (hasSellingPrice && !hasSellingPricePerPc) {
      console.log('\nStep 1: Adding selling_price_per_pc column...');
      
      db.run("ALTER TABLE consolidated ADD COLUMN selling_price_per_pc REAL", (err) => {
        if (err) {
          console.error('Error adding new column:', err);
          db.close();
          return;
        }
        console.log('✓ Added selling_price_per_pc column');
        
        console.log('Step 2: Copying data...');
        db.run("UPDATE consolidated SET selling_price_per_pc = selling_price", (err) => {
          if (err) {
            console.error('Error copying data:', err);
            db.close();
            return;
          }
          console.log('✓ Copied data from selling_price to selling_price_per_pc');
          
          console.log('Step 3: Getting table structure...');
          db.all("PRAGMA table_info(consolidated)", [], (err, updatedColumns) => {
            if (err) {
              console.error('Error getting updated schema:', err);
              db.close();
              return;
            }
            
            // Create column definitions without selling_price
            const filteredColumns = updatedColumns.filter(col => col.name !== 'selling_price');
            const columnDefs = filteredColumns.map(col => {
              let type = col.type || 'TEXT';
              return `${col.name} ${type}`;
            }).join(', ');
            const columnNames = filteredColumns.map(col => col.name).join(', ');
            
            console.log('Step 4: Creating new table structure...');
            
            db.run(`CREATE TABLE consolidated_new (${columnDefs})`, (err) => {
              if (err) {
                console.error('Error creating new table:', err);
                console.error('Column definitions:', columnDefs);
                db.close();
                return;
              }
              console.log('✓ Created new table structure');
              
              console.log('Step 5: Copying all data...');
              db.run(`INSERT INTO consolidated_new (${columnNames}) SELECT ${columnNames} FROM consolidated`, (err) => {
                if (err) {
                  console.error('Error copying data to new table:', err);
                  db.close();
                  return;
                }
                console.log('✓ Copied all data to new table');
                
                console.log('Step 6: Replacing old table...');
                db.run("DROP TABLE consolidated", (err) => {
                  if (err) {
                    console.error('Error dropping old table:', err);
                    db.close();
                    return;
                  }
                  console.log('✓ Dropped old table');
                  
                  db.run("ALTER TABLE consolidated_new RENAME TO consolidated", (err) => {
                    if (err) {
                      console.error('Error renaming new table:', err);
                      db.close();
                      return;
                    }
                    console.log('✓ Renamed new table to consolidated');
                    console.log('\n🎉 Successfully renamed selling_price to selling_price_per_pc!');
                    
                    // Verify the change
                    db.all("PRAGMA table_info(consolidated)", [], (err, finalColumns) => {
                      if (err) {
                        console.error('Error verifying changes:', err);
                        db.close();
                        return;
                      }
                      
                      console.log('\n✅ Final schema verification:');
                      finalColumns.forEach(col => {
                        console.log(`- ${col.name} (${col.type})`);
                      });
                      
                      const hasNewColumn = finalColumns.some(col => col.name === 'selling_price_per_pc');
                      const hasOldColumn = finalColumns.some(col => col.name === 'selling_price');
                      
                      console.log(`\n✅ Migration Results:`);
                      console.log(`- selling_price_per_pc exists: ${hasNewColumn}`);
                      console.log(`- selling_price removed: ${!hasOldColumn}`);
                      
                      if (hasNewColumn && !hasOldColumn) {
                        console.log('\n✅ Migration completed successfully!');
                      } else {
                        console.log('\n❌ Migration may have failed. Please check manually.');
                      }
                      
                      db.close();
                    });
                  });
                });
              });
            });
          });
        });
      });
    } else if (hasSellingPricePerPc && !hasSellingPrice) {
      console.log('\n✅ Column selling_price_per_pc already exists and selling_price is removed. Migration already completed.');
      db.close();
    } else if (hasSellingPricePerPc && hasSellingPrice) {
      console.log('\n⚠️  Both columns exist. Removing old selling_price column...');
      
      // Get schema without selling_price
      const filteredColumns = columns.filter(col => col.name !== 'selling_price');
      const columnDefs = filteredColumns.map(col => {
        let type = col.type || 'TEXT';
        return `${col.name} ${type}`;
      }).join(', ');
      const columnNames = filteredColumns.map(col => col.name).join(', ');
      
      db.run(`CREATE TABLE consolidated_temp (${columnDefs})`, (err) => {
        if (err) {
          console.error('Error creating temp table:', err);
          db.close();
          return;
        }
        
        db.run(`INSERT INTO consolidated_temp (${columnNames}) SELECT ${columnNames} FROM consolidated`, (err) => {
          if (err) {
            console.error('Error copying to temp table:', err);
            db.close();
            return;
          }
          
          db.run("DROP TABLE consolidated", (err) => {
            if (err) {
              console.error('Error dropping original table:', err);
              db.close();
              return;
            }
            
            db.run("ALTER TABLE consolidated_temp RENAME TO consolidated", (err) => {
              if (err) {
                console.error('Error renaming temp table:', err);
                db.close();
                return;
              }
              
              console.log('✅ Removed duplicate selling_price column. Migration completed.');
              db.close();
            });
          });
        });
      });
    } else {
      console.log('\n❌ Neither selling_price nor selling_price_per_pc column found.');
      db.close();
    }
  });
}, 2000); // Wait 2 seconds before starting
