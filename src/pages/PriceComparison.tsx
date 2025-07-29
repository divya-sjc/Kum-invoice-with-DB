import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";

const VENDOR_COUNT = 9;
const ROW_COUNT = 5;

export default function PriceComparison() {
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    // Always fetch latest data from backend on mount
    fetch("/api/price-comparison", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        // Sort vendors in descending order by id
        const vendorsData = Array.isArray(data.vendors)
          ? [...data.vendors].sort((a, b) => b.id - a.id)
          : [];
        setVendors(vendorsData);

        // Sort items in descending order by name
        const itemsData = Array.isArray(data.items)
          ? [...data.items].sort((a, b) => b.name.localeCompare(a.name))
          : [];

        // If items have prices as arrays, and vendors are sorted, reorder prices to match sorted vendors
        const formattedItems = itemsData.map(item => {
          let prices = Array.isArray(item.prices) ? item.prices : [];
          // If prices are already in vendor order, just use them
          if (prices.length === vendorsData.length) {
            // If vendors were sorted, reorder prices to match sorted vendor ids
            if (Array.isArray(data.vendors) && data.vendors.length === vendorsData.length) {
              const originalVendorIds = data.vendors.map(v => v.id);
              const sortedVendorIds = vendorsData.map(v => v.id);
              prices = sortedVendorIds.map(id => {
                const idx = originalVendorIds.indexOf(id);
                return idx !== -1 ? prices[idx] : "";
              });
            }
          } else {
            prices = Array(vendorsData.length).fill("");
          }
          return {
            ...item,
            name: item.name || "",
            prices
          };
        });
        setItems(formattedItems);
      })
      .catch(() => {
        setVendors([]);
        setItems([]);
      });
  }, []);

  const saveData = () => {
  setSaveStatus("");
  const quotedDate = new Date().toISOString();
  const priceEntries = [];
  items.forEach(item => {
    vendors.forEach((vendor, vIdx) => {
      const price = item.prices[vIdx];
      if (price !== "" && !isNaN(Number(price))) {
        priceEntries.push({
          itemName: item.name,
          vendorName: vendor.name,
          price: Number(price),
          quotedDate
        });
      }
    });
  });

  fetch("/api/price-comparison/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceEntries })
  })
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .then(data => {
      if (data.success) setSaveStatus("Saved!");
      else setSaveStatus("Error saving!");
    })
    .catch((err) => {
      console.error("Error saving data:", err);
      setSaveStatus("Error saving!");
    });
}

  const handlePriceChange = (itemIdx, vendorIdx, value) => {
    const newItems = [...items];
    newItems[itemIdx].prices[vendorIdx] = value;
    setItems(newItems);
  };

  // Add item: insert a new row at the beginning and save to backend
  const addItem = async () => {
    const name = window.prompt('Enter item name:');
    if (!name) return;
    const description = window.prompt('Enter item description:') || '';
    // Post to backend first
    try {
      const res = await fetch('/api/price-comparison/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      const newItem = {
        id: data.id || Date.now(),
        name,
        description,
        prices: Array(vendors.length).fill('')
      };
      setItems(prev => {
        const newItems = [newItem, ...prev];
        setTimeout(saveData, 0);
        return newItems;
      });
    } catch (err) {
      alert('Failed to add item to backend.');
    }
  };

  // Add vendor with prompt for name, communication method, and contact details, and save to backend
  const addVendor = async () => {
    const newVendorName = window.prompt('Enter new vendor name:');
    if (!newVendorName) return;
    const communicationMethod = window.prompt('Enter communication method (e.g., Email, Phone):') || '';
    const contactDetails = window.prompt('Enter contact details:') || '';
    // Post to backend first
    try {
      const res = await fetch('/api/price-comparison/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVendorName, communication: communicationMethod, contact_info: contactDetails })
      });
      const data = await res.json();
      setVendors(prevVendors => {
        const newVendors = [
          { id: data.id || Date.now(), name: newVendorName, communicationMethod, contactDetails },
          ...prevVendors
        ];
        setItems(prevItems => {
          const newItems = prevItems.map(item => ({
            ...item,
            prices: ['', ...item.prices]
          }));
          setTimeout(saveData, 0);
          return newItems;
        });
        return newVendors;
      });
    } catch (err) {
      alert('Failed to add vendor to backend.');
    }
  };

  const toggleRow = (index) => {
    setSelectedRows(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const deleteSelected = () => {
    setItems(items.filter((_, idx) => !selectedRows.includes(idx)));
    setSelectedRows([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Price Comparison</h2>

      <div className="flex gap-2 mb-4">
        <Button onClick={addItem}><PlusIcon className="w-4 h-4 mr-1" /> Add Item</Button>
        <Button onClick={addVendor}><PlusIcon className="w-4 h-4 mr-1" /> Add Vendor</Button>
        <Button onClick={saveData}>Save Table</Button>
        <Button onClick={deleteSelected} variant="destructive"><TrashIcon className="w-4 h-4 mr-1" /> Delete Selected</Button>
        {saveStatus && <span className="ml-4 text-green-700 font-semibold">{saveStatus}</span>}
      </div>

      <Table className="border border-black">
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Item</TableHead>
            {vendors.map((v, i) => (
              <TableHead key={i}>
                <input
                  type="text"
                  value={v.name}
                  onChange={e => {
                    const updated = [...vendors];
                    updated[i] = e.target.value;
                    setVendors(updated);
                  }}
                  className="border px-1 py-0.5 w-full"
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => {
            // Find the minimum price in the row (ignoring empty and non-numeric values)
            const numericPrices = item.prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
            const minPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : null;
            return (
              <TableRow key={i} className={selectedRows.includes(i) ? 'bg-red-50' : ''}>
                <TableCell>
                  <input type="checkbox" checked={selectedRows.includes(i)} onChange={() => toggleRow(i)} />
                </TableCell>
                <TableCell>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => {
                      const updated = [...items];
                      updated[i].name = e.target.value;
                      setItems(updated);
                    }}
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
                        onChange={e => handlePriceChange(i, j, e.target.value.replace(/[^0-9.]/g, ""))}
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
  );
}
