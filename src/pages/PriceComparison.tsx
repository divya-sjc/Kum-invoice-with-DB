import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";

const VENDOR_COUNT = 9;
const ROW_COUNT = 5;

export default function PriceComparison() {
  const [tables, setTables] = useState([]);
  const [selectedTableIdx, setSelectedTableIdx] = useState<number | null>(null);
  const [showNewTable, setShowNewTable] = useState(false);

  useEffect(() => {
    // Fetch all price_comparison_tables and build separate tables for each table id
    (async () => {
      const registryRes = await fetch("/api/price-comparison/tables");
      const registry = await registryRes.json();
      if (!Array.isArray(registry) || registry.length === 0) {
        setTables([{ vendors: [], items: [], saveStatus: '', selectedRows: [], selectedVendorCols: [] }]);
        return;
      }
      // Group all rows by table id, and collect unique vendor_ids and item_ids for each table
      const tablesById: Record<string, { id: number, created_at: string, vendorIds: Set<number>, itemIds: Set<number> }> = {};
      registry.forEach((row: any) => {
        if (!tablesById[row.id]) tablesById[row.id] = { id: row.id, created_at: row.created_at, vendorIds: new Set(), itemIds: new Set() };
        if (row.vendor_id) tablesById[row.id].vendorIds.add(row.vendor_id);
        if (row.item_id) tablesById[row.id].itemIds.add(row.item_id);
      });
      // Sort table ids by created_at descending
      const sortedTables = Object.values(tablesById).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // For each table, fetch vendors, items, and quotes, and build matrix
      const allTables = await Promise.all(sortedTables.map(async (tbl) => {
        // Fetch vendors for this table
        let vendors = [];
        if (tbl.vendorIds.size > 0) {
          const vRes = await fetch(`/api/price-comparison/vendors?ids=${[...tbl.vendorIds].join(",")}`);
          vendors = await vRes.json();
        }
        // Fetch items for this table
        let items = [];
        if (tbl.itemIds.size > 0) {
          const iRes = await fetch(`/api/price-comparison/items?ids=${[...tbl.itemIds].join(",")}`);
          items = await iRes.json();
        }
        // If no vendors or no items, skip this table
        if (vendors.length === 0 || items.length === 0) return null;
        // Fetch quotes for this table
        let quotes = [];
        const qRes = await fetch(`/api/price-comparison/quotes?tableId=${tbl.id}`);
        if (qRes.ok) quotes = await qRes.json();
        // Build a matrix: items as rows, vendors as columns, fill prices
        const vendorIdToIdx = vendors.reduce((acc: any, v: any, idx: number) => { acc[v.id] = idx; return acc; }, {});
        const itemsWithPrices = items.map((item: any) => {
          const prices = Array(vendors.length).fill("");
          quotes.forEach((q: any) => {
            if (q.item_id === item.id && vendorIdToIdx[q.vendor_id] !== undefined) {
              prices[vendorIdToIdx[q.vendor_id]] = q.price !== undefined ? String(q.price) : "";
            }
          });
          return { ...item, prices };
        });
        return {
          tableId: tbl.id,
          created_at: tbl.created_at,
          vendors,
          items: itemsWithPrices,
          saveStatus: '',
          selectedRows: [],
          selectedVendorCols: []
        };
      }));
      setTables(allTables.filter(Boolean));
    })();
  }, []);

  // Add new table at the top
  const addNewTable = () => {
    setShowNewTable(true);
    setTables([{ vendors: [], items: [], saveStatus: '', selectedRows: [] }, ...tables]);
  };

  // Table logic per table index
  const handleAddItem = (tableIdx) => async () => {
    const name = window.prompt('Enter item name:');
    if (!name) return;
    const description = window.prompt('Enter item description:') || '';
    // Add item to backend first
    const res = await fetch('/api/price-comparison/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    const data = await res.json();
    const newItem = {
      id: data.id, // use backend id
      name,
      description,
      prices: Array(tables[tableIdx].vendors.length).fill('')
    };
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].items = [newItem, ...updated[tableIdx].items];
      return updated;
    });
    // Also update price_comparison_quotes for this new item (if any prices are already filled)
    const table = tables[tableIdx];
    if (table && table.vendors && table.vendors.length > 0) {
      const priceEntries = [];
      table.vendors.forEach((vendor, vIdx) => {
        const price = newItem.prices[vIdx];
        if (price !== undefined && price !== "") {
          priceEntries.push({
            itemName: name,
            vendorName: vendor.name,
            price: price,
            quotedDate: null
          });
        }
      });
      if (priceEntries.length > 0) {
        await fetch("/api/price-comparison/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceEntries })
        });
      }
    }
  };

  const handleAddVendor = (tableIdx) => async () => {
    const newVendorName = window.prompt('Enter new vendor name:');
    if (!newVendorName) return;
    const communicationMethod = window.prompt('Enter communication method (e.g., Email, Phone):') || '';
    const contactDetails = window.prompt('Enter contact details:') || '';
    // Add vendor to backend first
    const res = await fetch('/api/price-comparison/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVendorName, communication: communicationMethod, contact_info: contactDetails })
    });
    const data = await res.json();
    const newVendor = {
      id: data.id, // use backend id
      name: newVendorName,
      communicationMethod,
      contactDetails
    };
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].vendors = [newVendor, ...updated[tableIdx].vendors];
      updated[tableIdx].items = updated[tableIdx].items.map(item => ({
        ...item,
        prices: ['', ...item.prices]
      }));
      return updated;
    });
  };

  const handleSaveData = (tableIdx) => async () => {
    const table = tables[tableIdx];
    // Prepare priceEntries for backend
    const priceEntries = [];
    table.items.forEach(item => {
      table.vendors.forEach((vendor, vIdx) => {
        const price = item.prices[vIdx];
        if (price !== undefined && price !== "") {
          priceEntries.push({
            itemName: item.name,
            vendorName: vendor.name,
            price: price,
            quotedDate: null // or add a date if available
          });
        }
      });
    });
    // Save to backend (quotes)
    await fetch("/api/price-comparison/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceEntries })
    });

    // Save table registry (id, vendor_id, item_id)
    let id = table.tableId || table.id;
    if (!id) {
      // Fetch all tables and find the highest id in frontend
      const res = await fetch("/api/price-comparison/tables");
      const allTables = await res.json();
      let maxId = 0;
      if (Array.isArray(allTables) && allTables.length > 0) {
        maxId = allTables.reduce((acc, row) => row.id > acc ? row.id : acc, 0);
      }
      id = maxId + 1;
      setTables(prev => {
        const updated = [...prev];
        updated[tableIdx].tableId = id;
        return updated;
      });
    }
    // Now, for each vendor/item pair, save in price_comparison_tables
    const vendor_id = table.vendors.map(v => v.id).filter(Boolean);
    const item_id = table.items.map(i => i.id).filter(Boolean);
    if (id && vendor_id.length && item_id.length) {
      // Send all pairs in one request (bulk insert)
      await fetch("/api/price-comparison/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          vendor_id,
          item_id
        })
      });
    }
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].saveStatus = 'Saved!';
      return updated;
    });
    setTimeout(() => {
      setTables(prev => {
        const updated = [...prev];
        updated[tableIdx].saveStatus = '';
        return updated;
      });
    }, 2000);
  }; // <-- END handleSaveData

  // Delete selected items (rows) from backend and update state
  const handleDeleteSelected = (tableIdx) => async () => {
    const selectedIds = tables[tableIdx].selectedRows.map(idx => tables[tableIdx].items[idx].id);
    // Call backend for each item id
    await Promise.all(selectedIds.map(id =>
      fetch(`/api/price-comparison/items/${id}`, { method: 'DELETE' })
    ));
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].items = updated[tableIdx].items.filter((item, idx) => !updated[tableIdx].selectedRows.includes(idx));
      updated[tableIdx].selectedRows = [];
      return updated;
    });
  };

  // Combined delete logic for items and vendors
  const handleDeleteSelectedUnified = (tableIdx) => async () => {
    const table = tables[tableIdx];
    // Delete selected item rows
    const selectedItemIds = table.selectedRows.map(idx => table.items[idx].id);
    await Promise.all(selectedItemIds.map(id =>
      fetch(`/api/price-comparison/items/${id}`, { method: 'DELETE' })
    ));
    // Remove items from state
    let updatedItems = table.items.filter((_, idx) => !table.selectedRows.includes(idx));

    // Delete selected vendor columns (if all prices in that column are empty)
    const selectedVendorCols = table.selectedVendorCols || [];
    const deletableVendorIdxs = selectedVendorCols.filter(vendorIdx =>
      updatedItems.every(item => !item.prices[vendorIdx] || item.prices[vendorIdx] === "")
    );
    await Promise.all(deletableVendorIdxs.map(async vendorIdx => {
      const vendor = table.vendors[vendorIdx];
      if (vendor && vendor.id) {
        await fetch(`/api/price-comparison/vendors/${vendor.id}`, { method: 'DELETE' });
      }
    }));
    // Remove vendor columns and update items' prices arrays
    deletableVendorIdxs.sort((a, b) => b - a).forEach(vendorIdx => {
      table.vendors.splice(vendorIdx, 1);
      updatedItems = updatedItems.map(item => ({
        ...item,
        prices: item.prices.filter((_, idx) => idx !== vendorIdx)
      }));
    });

    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].items = updatedItems;
      updated[tableIdx].vendors = table.vendors;
      updated[tableIdx].selectedRows = [];
      updated[tableIdx].selectedVendorCols = [];
      return updated;
    });
  };

  // Add vendor selection state to each table
  useEffect(() => {
    setTables(prev => prev.map(table => ({
      ...table,
      selectedVendorCols: table.selectedVendorCols || []
    })));
  }, []);

  // Toggle vendor column selection
  const handleToggleVendorCol = (tableIdx, vendorIdx) => {
    setTables(prev => {
      const updated = [...prev];
      const sel = updated[tableIdx].selectedVendorCols || [];
      updated[tableIdx].selectedVendorCols = sel.includes(vendorIdx)
        ? sel.filter(i => i !== vendorIdx)
        : [...sel, vendorIdx];
      return updated;
    });
  };

  // Delete selected vendor columns (if all prices in that column are empty)
  const handleDeleteSelectedVendors = (tableIdx) => async () => {
    const table = tables[tableIdx];
    const selectedVendorCols = table.selectedVendorCols || [];
    // Only allow deletion if all prices in the vendor column are empty
    const deletableVendorIdxs = selectedVendorCols.filter(vendorIdx =>
      table.items.every(item => !item.prices[vendorIdx] || item.prices[vendorIdx] === "")
    );
    // Call backend for each vendor id
    await Promise.all(deletableVendorIdxs.map(async vendorIdx => {
      const vendor = table.vendors[vendorIdx];
      if (vendor && vendor.id) {
        await fetch(`/api/price-comparison/vendors/${vendor.id}`, { method: 'DELETE' });
      }
    }));
    setTables(prev => {
      const updated = [...prev];
      // Remove vendor columns and update items' prices arrays
      deletableVendorIdxs.sort((a, b) => b - a).forEach(vendorIdx => {
        updated[tableIdx].vendors.splice(vendorIdx, 1);
        updated[tableIdx].items = updated[tableIdx].items.map(item => ({
          ...item,
          prices: item.prices.filter((_, idx) => idx !== vendorIdx)
        }));
      });
      updated[tableIdx].selectedVendorCols = [];
      return updated;
    });
  };

  const handleToggleRow = (tableIdx, rowIdx) => {
    setTables(prev => {
      const updated = [...prev];
      const sel = updated[tableIdx].selectedRows;
      updated[tableIdx].selectedRows = sel.includes(rowIdx)
        ? sel.filter(i => i !== rowIdx)
        : [...sel, rowIdx];
      return updated;
    });
  };

  const handlePriceChange = (tableIdx, itemIdx, vendorIdx, value) => {
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].items[itemIdx].prices[vendorIdx] = value;
      return updated;
    });
    // Also update price_comparison_quotes in backend for this cell
    const item = tables[tableIdx].items[itemIdx];
    const vendor = tables[tableIdx].vendors[vendorIdx];
    if (item && vendor) {
      fetch("/api/price-comparison/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceEntries: [{
            itemName: item.name,
            vendorName: vendor.name,
            price: value,
            quotedDate: null
          }]
        })
      });
    }
  };

  const handleItemNameChange = (tableIdx, itemIdx, value) => {
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].items[itemIdx].name = value;
      return updated;
    });
  };

  const handleVendorNameChange = (tableIdx, vendorIdx, value) => {
    setTables(prev => {
      const updated = [...prev];
      updated[tableIdx].vendors[vendorIdx].name = value;
      return updated;
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Price Comparison</h2>
      <Button onClick={addNewTable} className="mb-4"><PlusIcon className="w-4 h-4 mr-1" /> New Table</Button>
      {tables.map((table, tableIdx) => (
        <div key={tableIdx} className="mb-8 border-2 border-gray-400 rounded-lg p-4 bg-white relative">
          {/* Delete Table Button */}
          <Button
            onClick={async () => {
              const tableId = table.tableId;
              if (tableId) {
                await fetch(`/api/price-comparison/table/${tableId}`, { method: 'DELETE' });
              }
              setTables(prev => prev.filter((_, idx) => idx !== tableIdx));
              if (selectedTableIdx === tableIdx) setSelectedTableIdx(null);
            }}
            variant="destructive"
            size="sm"
            className="absolute right-2 top-2"
            title="Delete This Table"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
          <div className="flex gap-2 mb-4">
            <Button onClick={handleAddItem(tableIdx)}><PlusIcon className="w-4 h-4 mr-1" /> Add Item</Button>
            <Button onClick={handleAddVendor(tableIdx)}><PlusIcon className="w-4 h-4 mr-1" /> Add Vendor</Button>
            <Button onClick={handleSaveData(tableIdx)}>Save Table</Button>
            <Button onClick={handleDeleteSelectedUnified(tableIdx)} variant="destructive"><TrashIcon className="w-4 h-4 mr-1" /> Delete Selected</Button>
            {table.saveStatus && <span className="ml-4 text-green-700 font-semibold">{table.saveStatus}</span>}
          </div>
          <Table className="border border-black">
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Item</TableHead>
                {table.vendors.map((v, i) => (
                  <TableHead key={i} className="relative">
                    <input
                      type="checkbox"
                      checked={table.selectedVendorCols?.includes(i) || false}
                      onChange={() => handleToggleVendorCol(tableIdx, i)}
                      className="absolute left-0 top-1/2 -translate-y-1/2" title="Select Vendor Column" />
                    <input
                      type="text"
                      value={v.name}
                      onChange={e => handleVendorNameChange(tableIdx, i, e.target.value)}
                      className="border px-1 py-0.5 w-full pl-6"
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.items.map((item, i) => {
                const numericPrices = item.prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
                const minPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : null;
                return (
                  <TableRow key={i} className={table.selectedRows.includes(i) ? 'bg-red-50' : ''}>
                    <TableCell>
                      <input type="checkbox" checked={table.selectedRows.includes(i)} onChange={() => handleToggleRow(tableIdx, i)} />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleItemNameChange(tableIdx, i, e.target.value)}
                        className="border px-2 py-1 w-full"
                      />
                    </TableCell>
                    {item.prices.map((p, j) => {
                      const priceNum = parseFloat(p);
                      const isMin = !isNaN(priceNum) && minPrice !== null && priceNum === minPrice;
                      return (
                        <TableCell key={j}>
                          <input
                            type="number"
                            value={p}
                            onChange={e => handlePriceChange(tableIdx, i, j, e.target.value.replace(/[^0-9.]/g, ""))}
                            className={`border px-2 py-1 w-full text-center ${isMin ? 'bg-green-200' : ''}`}
                            inputMode="decimal"
                            pattern="[0-9]*"
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
