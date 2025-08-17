import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Types
interface Vendor {
  vendor_id: number;
  vendor_name: string;
  vendor_contact?: string;
}

interface Item {
  item_id: number;
  item_name: string;
  item_description?: string;
  prices: string[];
}

interface TableData {
  table_id: number;
  title: string;
  vendors: Vendor[];
  items: Item[];
}

export default function PriceComparison() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContactDetail, setNewVendorContactDetail] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [activeTableId, setActiveTableId] = useState<number | null>(null);

  // Fetch tables on load
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/price-comparison/tables");
      const data = await res.json();
      // Fetch details for each table
      const allTables: TableData[] = [];
      for (const tbl of data) {
        const detailsRes = await fetch(`/api/price-comparison/tables/${tbl.table_id}`);
        const details = await detailsRes.json();

        const vendorList = details.vendors || [];
        const itemList = (details.items || []).map((item: any) => {
          const prices = vendorList.map((v: any) => {
            const q = details.quotes.find(
              (qt: any) => qt.item_id === item.item_id && qt.vendor_id === v.vendor_id
            );
            return q ? String(q.price) : "";
          });
          return { ...item, prices };
        });

        allTables.push({
          table_id: tbl.table_id,
          title: tbl.title,
          vendors: vendorList,
          items: itemList,
        });
      }
      setTables(allTables);
    })();
  }, []);

  // Create new table
  const handleAddTable = async () => {
    const title = prompt("Enter new table title:");
    if (!title) return;
    const res = await fetch("/api/price-comparison/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    setTables([{ table_id: data.table_id, title, vendors: [], items: [] }, ...tables]);
  };

  // Save vendor
  const handleSaveVendor = async () => {
    if (!newVendorName || !activeTableId) return;
    await fetch(`/api/price-comparison/${activeTableId}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
      { vendor_name: newVendorName, vendor_contact: newVendorContactDetail }
    ]),
    });
    // refresh table
    const res = await fetch(`/api/price-comparison/tables/${activeTableId}`);
    const details = await res.json();
    const vendorList = details.vendors || [];
    const itemList = (details.items || []).map((item: any) => {
      const prices = vendorList.map((v: any) => {
        const q = details.quotes.find(
          (qt: any) => qt.item_id === item.item_id && qt.vendor_id === v.vendor_id
        );
        return q ? String(q.price) : "";
      });
      return { ...item, prices };
    });
    setTables(prev =>
      prev.map(tbl =>
        tbl.table_id === activeTableId
          ? { ...tbl, vendors: vendorList, items: itemList }
          : tbl
      )
    );
    setShowVendorModal(false);
    setNewVendorName("");
    setNewVendorContactDetail("");
  };

  // Save item
  const handleSaveItem = async () => {
    if (!newItemName || !activeTableId) return;
    await fetch(`/api/price-comparison/${activeTableId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
      { item_name: newItemName, item_description: newItemDescription }
      ]),
    });
    // refresh table
    const res = await fetch(`/api/price-comparison/tables/${activeTableId}`);
    const details = await res.json();
    const vendorList = details.vendors || [];
    const itemList = (details.items || []).map((item: any) => {
      const prices = vendorList.map((v: any) => {
        const q = details.quotes.find(
          (qt: any) => qt.item_id === item.item_id && qt.vendor_id === v.vendor_id
        );
        return q ? String(q.price) : "";
      });
      return { ...item, prices };
    });
    setTables(prev =>
      prev.map(tbl =>
        tbl.table_id === activeTableId
          ? { ...tbl, items: itemList }
          : tbl
      )
    );
    setShowItemModal(false);
    setNewItemName("");
    setNewItemDescription("");
  };

  // Handle price update
  const handlePriceChange = async (
    tableId: number,
    itemIdx: number,
    vendorIdx: number,
    value: string
  ) => {
    setTables(prev => {
      const updated = [...prev];
      const tbl = updated.find(t => t.table_id === tableId);
      if (tbl) {
        tbl.items[itemIdx].prices[vendorIdx] = value;
      }
      return updated;
    });
    const table = tables.find(t => t.table_id === tableId);
    if (!table) return;
    const item = table.items[itemIdx];
    const vendor = table.vendors[vendorIdx];
    await fetch(`/api/price-comparison/${tableId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: item.item_id,
        vendor_id: vendor.vendor_id,
        price: parseFloat(value) || 0,
      }),
    });
  };

  // Delete a whole table
const handleDeleteTable = async (tableId: number) => {
  if (!confirm("Are you sure you want to delete this table?")) return;
  const res = await fetch(`/api/price-comparison/tables/${tableId}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Failed to delete table. Please try again.");
    return;
  }
  setTables(prev => prev.filter(t => t.table_id !== tableId));
  if (activeTableId === tableId) {
    setShowVendorModal(false);
    setShowItemModal(false);
    setActiveTableId(null);
  }
};

// Delete a vendor
const handleDeleteVendor = async (tableId: number, vendorId: number) => {
  if (!confirm("Are you sure you want to delete this vendor?")) return;
  await fetch(`/api/price-comparison/vendors/${vendorId}`, { method: "DELETE" });

  // Refresh table
  const res = await fetch(`/api/price-comparison/tables/${tableId}`);
  const details = await res.json();
  const vendorList = details.vendors || [];
  const itemList = (details.items || []).map((item: any) => {
    const prices = vendorList.map((v: any) => {
      const q = details.quotes.find(
        (qt: any) => qt.item_id === item.item_id && qt.vendor_id === v.vendor_id
      );
      return q ? String(q.price) : "";
    });
    return { ...item, prices };
  });
  setTables(prev =>
    prev.map(tbl =>
      tbl.table_id === tableId
        ? { ...tbl, vendors: vendorList, items: itemList }
        : tbl
    )
  );
};

// Delete an item
const handleDeleteItem = async (tableId: number, itemId: number) => {
  if (!confirm("Are you sure you want to delete this item?")) return;
  await fetch(`/api/price-comparison/items/${itemId}`, { method: "DELETE" });

  // Refresh table
  const res = await fetch(`/api/price-comparison/tables/${tableId}`);
  const details = await res.json();
  const vendorList = details.vendors || [];
  const itemList = (details.items || []).map((item: any) => {
    const prices = vendorList.map((v: any) => {
      const q = details.quotes.find(
        (qt: any) => qt.item_id === item.item_id && qt.vendor_id === v.vendor_id
      );
      return q ? String(q.price) : "";
    });
    return { ...item, prices };
  });
  setTables(prev =>
    prev.map(tbl =>
      tbl.table_id === tableId
        ? { ...tbl, vendors: vendorList, items: itemList }
        : tbl
    )
  );
};


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Price Comparison</h1>
      <Button onClick={handleAddTable} className="mb-6">
        <PlusIcon className="w-4 h-4 mr-1" /> New Table
      </Button>
      
      {tables.map(table => (
        <div key={table.table_id} className="mb-8 border rounded p-4 bg-white">
          <h2 className="font-bold mb-3">{table.title}</h2>
          <div className="flex gap-2 mb-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteTable(table.table_id)}
            >
              <TrashIcon className="w-4 h-4 mr-1" /> Delete Table
            </Button>
            <Button
              onClick={() => {
                setActiveTableId(table.table_id);
                setShowItemModal(true);
              }}
            >
              <PlusIcon className="w-4 h-4 mr-1" /> Add Item
            </Button>
            <Button
              onClick={() => {
                setActiveTableId(table.table_id);
                setShowVendorModal(true);
              }}
            >
              <PlusIcon className="w-4 h-4 mr-1" /> Add Vendor
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                {table.vendors.map(v => (
                  <TableHead key={v.vendor_id} className="items-center gap-1">
                    <span>{v.vendor_name}</span>
                    <TrashIcon
                      className="w-4 h-4 text-red-500 cursor-pointer"
                      onClick={() => handleDeleteVendor(table.table_id, v.vendor_id)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.items.map((item, i) => {
                const numericPrices = item.prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
                const minPrice = numericPrices.length ? Math.min(...numericPrices) : null;
                return (
                  <TableRow key={item.item_id}>
                    <TableCell className="flex items-center gap-1">
                      {item.item_name}
                      <TrashIcon
                        className="w-4 h-4 text-red-500 cursor-pointer"
                        onClick={() => handleDeleteItem(table.table_id, item.item_id)}
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
                            onChange={e =>
                              handlePriceChange(table.table_id, i, j, e.target.value)
                            }
                            className={`border px-2 py-1 w-full text-center ${
                              isMin ? "bg-green-200" : ""
                            }`}
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

      {/* Vendor Modal */}
      <Dialog open={showVendorModal} onOpenChange={setShowVendorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Vendor Name"
            value={newVendorName}
            onChange={e => setNewVendorName(e.target.value)}
          />
          <Input
            placeholder="Vendor Contact Details"
            value={newVendorContactDetail}
            onChange={e => setNewVendorContactDetail(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleSaveVendor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Item Name"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
          />
          <Input
            placeholder="Item Description"
            value={newItemDescription}
            onChange={e => setNewItemDescription(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleSaveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
