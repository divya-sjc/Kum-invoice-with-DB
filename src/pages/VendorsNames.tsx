import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";

interface Vendor {
  vendor_id: number;
  date: string;
  vendorName: string;
  contactDetails: string;
}

const emptyVendor: Omit<Vendor, "vendor_id"> = {
  date: new Date().toISOString().split("T")[0],
  vendorName: "",
  contactDetails: "",
};

export default function VendorsNames() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Vendor, "vendor_id">>(emptyVendor);

  const fetchVendors = async () => {
    const res = await fetch("/api/vendor-names");
    const data = await res.json();
    setVendors(data);
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNew = () => {
    setForm(emptyVendor);
    setEditIdx(null);
    setModalOpen(true);
  };

  const handleEdit = (idx: number) => {
    const v = vendors[idx];
    setForm({ date: v.date, vendorName: v.vendorName, contactDetails: v.contactDetails });
    setEditIdx(idx);
    setModalOpen(true);
  };

  const handleDelete = async (vendor_id: number) => {
    if (!window.confirm("Delete this vendor?")) return;
    const res = await fetch("/api/vendor-names", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [vendor_id] }),
    });
    if (res.ok) fetchVendors();
    else alert("Delete failed");
  };

  const handleSave = async () => {
    if (!form.vendorName.trim()) return alert("Vendor name required");
    if (editIdx === null) {
      // New
      const res = await fetch("/api/vendor-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return alert("Save failed");
    } else {
      // Edit
      const vendor_id = vendors[editIdx].vendor_id;
      const res = await fetch(`/api/vendor-names/${vendor_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return alert("Update failed");
    }
    setModalOpen(false);
    fetchVendors();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Vendor Names</h2>
      <Button className="bg-blue-700 text-white hover:bg-blue-900" onClick={handleNew}>
            <PlusIcon className="w-4 h-4 mr-1" /> New Vendor
      </Button><div></div>
      {vendors.length === 0 ? (
        <div className="text-gray-500">No vendors available.</div>
      ) : (
        <table className="min-w-full border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1">Date</th>
              <th className="border border-black px-2 py-1">Vendor Name</th>
              <th className="border border-black px-2 py-1">Contact Details</th>
              <th className="border border-black px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, idx) => (
              <tr key={v.vendor_id}>
                <td className="border border-black px-2 py-1">{v.date}</td>
                <td className="border border-black px-2 py-1">{v.vendorName}</td>
                <td className="border border-black px-2 py-1">{v.contactDetails}</td>
                <td className="border border-black px-2 py-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(idx)} className="mr-2">Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(v.vendor_id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-[340px] max-w-[90vw] shadow-lg">
            <h3 className="text-xl font-bold mb-4">{editIdx === null ? "Add Vendor" : "Edit Vendor"}</h3>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <label className="flex flex-col text-sm">
                Vendor Name
                <input name="vendorName" value={form.vendorName} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Contact Details
                <textarea name="contactDetails" value={form.contactDetails} onChange={handleInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Date
                <input name="date" type="date" value={form.date} onChange={handleInputChange} className="border rounded px-2 py-1" />
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
