import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./invoices.db');

console.log('Checking current schema...');

// First, check if the column exists
db.all("PRAGMA table_info(consolidated)", [], (err, columns) => {
  if (err) {
    console.error('Error checking schema:', err);
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
    console.log('\nRenaming selling_price to selling_price_per_pc...');
    
    // SQLite doesn't support column renaming directly, so we need to:
    // 1. Add the new column
    // 2. Copy data from old column to new column
    // 3. Create a new table without the old column
    // 4. Copy all data to the new table
    // 5. Drop the old table and rename the new one
    
    db.serialize(() => {
      // Step 1: Add the new column
      db.run("ALTER TABLE consolidated ADD COLUMN selling_price_per_pc TEXT", (err) => {
        if (err) {
          console.error('Error adding new column:', err);
          return;
        }
        console.log('✓ Added selling_price_per_pc column');
        
        // Step 2: Copy data from old column to new column
        db.run("UPDATE consolidated SET selling_price_per_pc = selling_price", (err) => {
          if (err) {
            console.error('Error copying data:', err);
            return;
          }
          console.log('✓ Copied data from selling_price to selling_price_per_pc');
          
          // Step 3: Get the complete schema to recreate without selling_price
          db.all("PRAGMA table_info(consolidated)", [], (err, newColumns) => {
            if (err) {
              console.error('Error getting updated schema:', err);
              return;
            }
            
            // Filter out the old selling_price column
            const filteredColumns = newColumns.filter(col => col.name !== 'selling_price');
            const columnDefs = filteredColumns.map(col => `${col.name} ${col.type}`).join(', ');
            const columnNames = filteredColumns.map(col => col.name).join(', ');
            
            console.log('Creating new table without selling_price column...');
            
            // Step 4: Create new table
            db.run(`CREATE TABLE consolidated_new (${columnDefs})`, (err) => {
              if (err) {
                console.error('Error creating new table:', err);
                return;
              }
              console.log('✓ Created new table structure');
              
              // Step 5: Copy all data to new table
              db.run(`INSERT INTO consolidated_new (${columnNames}) SELECT ${columnNames} FROM consolidated`, (err) => {
                if (err) {
                  console.error('Error copying data to new table:', err);
                  return;
                }
                console.log('✓ Copied all data to new table');
                
                // Step 6: Drop old table and rename new one
                db.run("DROP TABLE consolidated", (err) => {
                  if (err) {
                    console.error('Error dropping old table:', err);
                    return;
                  }
                  console.log('✓ Dropped old table');
                  
                  db.run("ALTER TABLE consolidated_new RENAME TO consolidated", (err) => {
                    if (err) {
                      console.error('Error renaming new table:', err);
                      return;
                    }
                    console.log('✓ Renamed new table to consolidated');
                    console.log('\n🎉 Successfully renamed selling_price to selling_price_per_pc!');
                    
                    // Verify the change
                    db.all("PRAGMA table_info(consolidated)", [], (err, finalColumns) => {
                      if (err) {
                        console.error('Error verifying changes:', err);
                        return;
                      }
                      
                      console.log('\nFinal schema:');
                      finalColumns.forEach(col => {
                        console.log(`- ${col.name} (${col.type})`);
                      });
                      
                      db.close();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  } else if (hasSellingPricePerPc) {
    console.log('\n✓ Column selling_price_per_pc already exists. No changes needed.');
    db.close();
  } else {
    console.log('\n❌ Neither selling_price nor selling_price_per_pc column found.');
    db.close();
  }
});
