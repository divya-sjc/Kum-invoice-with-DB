import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface VendorItem {
  vitem_id: number;
  itemName: string;
  pricePerUnit: number;
  quantity: number;
  total: number;
  vendor_id: number;
  vinvoice_id: number;
}

const emptyItem: Omit<VendorItem, "vitem_id"> = {
  itemName: "",
  pricePerUnit: 0,
  quantity: 0,
  total: 0,
  vendor_id: 0,
  vinvoice_id: 0,
};

export default function VendorsItems() {
  const [items, setItems] = useState<VendorItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<VendorItem, "vitem_id">>(emptyItem);
  const [filter, setFilter] = useState({ date: "", vinvoice_id: "" });

  const fetchItems = async () => {
    let url = "/api/vendor-items";
    const params = [];
    if (filter.date) params.push(`date=${encodeURIComponent(filter.date)}`);
    if (filter.vinvoice_id) params.push(`vinvoice_id=${encodeURIComponent(filter.vinvoice_id)}`);
    if (params.length) url += "?" + params.join("&");
    const res = await fetch(url);
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => { fetchItems(); }, [filter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "pricePerUnit" || name === "quantity" || name === "total" || name === "vendor_id" || name === "vinvoice_id" ? Number(value) : value }));
  };

  const handleNew = () => {
    setForm(emptyItem);
    setEditIdx(null);
    setModalOpen(true);
  };

  const handleEdit = (idx: number) => {
    const it = items[idx];
    setForm({
      itemName: it.itemName,
      pricePerUnit: it.pricePerUnit,
      quantity: it.quantity,
      total: it.total,
      vendor_id: it.vendor_id,
      vinvoice_id: it.vinvoice_id,
    });
    setEditIdx(idx);
    setModalOpen(true);
  };

  const handleDelete = async (vitem_id: number) => {
    if (!window.confirm("Delete this item?")) return;
    const res = await fetch("/api/vendor-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [vitem_id] }),
    });
    if (res.ok) fetchItems();
    else alert("Delete failed");
  };

  const handleSave = async () => {
    if (!form.itemName.trim()) return alert("Item name required");
    if (editIdx === null) {
      // New
      const res = await fetch("/api/vendor-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return alert("Save failed");
    } else {
      // Edit
      const vitem_id = items[editIdx].vitem_id;
      const res = await fetch(`/api/vendor-items/${vitem_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return alert("Update failed");
    }
    setModalOpen(false);
    fetchItems();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Vendor Items</h2>
      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1">Date</label>
          <input
            type="date"
            value={filter.date}
            onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Invoice ID</label>
          <input
            type="number"
            value={filter.vinvoice_id}
            onChange={e => setFilter(f => ({ ...f, vinvoice_id: e.target.value }))}
            className="border rounded px-2 py-1"
            placeholder="Invoice ID"
          />
        </div>
        <Button variant="outline" onClick={() => setFilter({ date: "", vinvoice_id: "" })}>Clear Filters</Button>
      </div>
      {items.length === 0 ? (
        <div className="text-gray-500">No items available.</div>
      ) : (
        <table className="min-w-full border border-black text-sm">
          <thead>
            <tr className="bg-[#4472C4]">
              <th className="border border-black px-2 py-1 text-white">Item Name</th>
              <th className="border border-black px-2 py-1 text-white">Price/Unit</th>
              <th className="border border-black px-2 py-1 text-white">Quantity</th>
              <th className="border border-black px-2 py-1 text-white">Total</th>
              <th className="border border-black px-2 py-1 text-white">Vendor ID</th>
              <th className="border border-black px-2 py-1 text-white">Invoice ID</th>
              <th className="border border-black px-2 py-1 text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.vitem_id}>
                <td className="border border-black px-2 py-1">{it.itemName}</td>
                <td className="border border-black px-2 py-1">{it.pricePerUnit}</td>
                <td className="border border-black px-2 py-1">{it.quantity}</td>
                <td className="border border-black px-2 py-1">{it.total}</td>
                <td className="border border-black px-2 py-1">{it.vendor_id}</td>
                <td className="border border-black px-2 py-1">{it.vinvoice_id}</td>
                <td className="border border-black px-2 py-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(idx)} className="mr-2">Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(it.vitem_id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-[340px] max-w-[90vw] shadow-lg">
            <h3 className="text-xl font-bold mb-4">{editIdx === null ? "Add Item" : "Edit Item"}</h3>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <label className="flex flex-col text-sm">
                Item Name
                <input name="itemName" value={form.itemName} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Price Per Unit
                <input name="pricePerUnit" type="number" value={form.pricePerUnit} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Quantity
                <input name="quantity" type="number" value={form.quantity} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Total
                <input name="total" type="number" value={form.total} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Vendor ID
                <input name="vendor_id" type="number" value={form.vendor_id} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Invoice ID
                <input name="vinvoice_id" type="number" value={form.vinvoice_id} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
            </div>
            <div className="flex gap-4 justify-end">
              <Button onClick={handleSave} className="bg-green-600 text-white">Save</Button>
              <Button onClick={() => setModalOpen(false)} variant="outline">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
