import React, { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, TrashIcon, UploadIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const emptyInvoice = {
  vinvoice_id: 0,
  date: new Date().toISOString().split("T")[0],
  vendor_id: 0,
  total_quantity: 0,
  totalInvoiceValue: 0,
  cgst : 0,
  sgst: 0,  
  igst: 0,
  paymentStatus: "Pending",
  paymentDate: "",
  veshadInvoiceRefNo: "",
};

const emptyVendor = {
  vendorName: "",
  contactDetails: "",
  date: new Date().toISOString().split("T")[0],
};

const emptyItems = {
  vitems_id: 0,
  itemName: "",
  pricePerUnit: 0,
  quantity: 0,
  total: 0,
  vendor_id: 0,
  vinvoice_id: 0,
};

export default function VendorsInvoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [searchItemName, setSearchItemName] = useState("");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    vendorName: '',
    date: new Date().toISOString().split('T')[0],
    refNo: '',
    paymentStatus: 'Pending',
    paymentDate: '', 
    items: [{ itemName: '', pricePerUnit: 0, quantity: 0, total: 0 }],
    cgst: 0,
    sgst: 0,
    igst: 0,
  });
  const [vendorNames, setVendorNames] = useState<string[]>([]);
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    const res = await fetch("/api/vendors-invoices");
    const data = await res.json();
    setRows(data);
  };

  useEffect(() => {
    fetchData();
    // Fetch vendor names and ids for dropdown
    fetch('/api/vendor-names')
      .then(res => res.json())
      .then(data => {
        setVendorNames(data.map((v: any) => v.vendorName));
        setVendorList(data); // Save full vendor objects for id lookup
      });
  }, []);

  // Filtered rows by item name
  const filteredRows = searchItemName.trim()
    ? rows.filter(row => {
        if (!row.items || !Array.isArray(row.items)) return false;
        return row.items.some(item =>
          item.itemName && item.itemName.toLowerCase().includes(searchItemName.toLowerCase())
        );
      })
    : rows;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedRows.length > 0 && selectedRows.length < rows.length;
    }
  }, [selectedRows, rows]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let json = XLSX.utils.sheet_to_json(sheet);
      // Filter out completely empty rows
      json = json.filter((row: any) => Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== ""));
      const res = await fetch("/api/vendors-invoices/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: json }),
      });
      if (!res.ok) throw new Error("Import failed");
      await fetchData();
      alert("Import successful");
    } catch (err) {
      alert("Import failed");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (ids: number[]) => {
    if (!window.confirm("Delete selected vendor invoices?")) return;
    const res = await fetch("/api/vendors-invoices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    setSelectedRows([]);
    await fetchData();
  };

  const handleVendorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVendorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveVendor = async () => {
    const res = await fetch("/api/vendor-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorForm),
    });
    if (!res.ok) {
      alert("Failed to add vendor");
      return;
    }
    setVendorModalOpen(false);
    setVendorForm(emptyVendor);
    alert("Vendor added!");
  };

  const handleInvoiceFormChange = async (e) => {
    const { name, value } = e.target;
    setInvoiceForm((prev) => {
      let updated = { ...prev, [name]: value };
      if (name === 'paymentStatus' && value !== 'Paid') {
        updated.paymentDate = '';
      }
      return updated;
    });

    // If vendorName is changed, fetch vendor_id using the new endpoint
    if (name === 'vendorName' && value) {
      try {
        const res = await fetch(`/api/vendor-names/by-name?name=${encodeURIComponent(value)}`);
        if (res.ok) {
          const vendor = await res.json();
          setSelectedVendorId(vendor.vendor_id);
        } else {
          setSelectedVendorId(null);
        }
      } catch {
        setSelectedVendorId(null);
      }
    }
  };

  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setInvoiceForm((prev) => {
      const items = [...prev.items];
      items[idx][name] = name === 'itemName' ? value : Number(value);
      if (name === 'pricePerUnit' || name === 'quantity') {
        items[idx].total = (items[idx].pricePerUnit || 0) * (items[idx].quantity || 0);
      }
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setInvoiceForm((prev) => ({ ...prev, items: [...prev.items, { itemName: '', pricePerUnit: 0, quantity: 0, total: 0 }] }));
  };

  const handleRemoveItem = (idx) => {
    setInvoiceForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSaveInvoice = async () => {
    // Use selectedVendorId if available, else fallback to vendorList lookup
    let vendor_id = selectedVendorId;
    if (!vendor_id) {
      const selectedVendor = vendorList.find(v => v.vendorName === invoiceForm.vendorName);
      vendor_id = selectedVendor ? selectedVendor.vendor_id : null;
    }
    if (!vendor_id) {
      alert('Please select a valid vendor');
      return;
    }
    // Compose invoice payload for vendors_invoices
    const totalQty = invoiceForm.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const subtotal = invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
    const cgstAmount = ((Number(invoiceForm.cgst) || 0) * subtotal) / 100;
    const sgstAmount = ((Number(invoiceForm.sgst) || 0) * subtotal) / 100;
    const igstAmount = ((Number(invoiceForm.igst) || 0) * subtotal) / 100;
    const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;
    const invoicePayload = {
      date: invoiceForm.date,
      vendor_id,
      total_quantity: totalQty,
      totalInvoiceValue: subtotal,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      paymentStatus: invoiceForm.paymentStatus,
      paymentDate: invoiceForm.paymentStatus === "Paid" ? invoiceForm.paymentDate : "",
      veshadInvoiceRefNo: invoiceForm.refNo || '',
    };
    // Save invoice, get new invoice id
    const res = await fetch('/api/vendors-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    });
    if (!res.ok) {
      alert('Failed to save invoice');
      return;
    }
    const { id: vinvoice_id } = await res.json();
    // Save items to vendor_items (one at a time, as backend expects single object)
    const items = invoiceForm.items.filter(i => i.itemName.trim()).map(i => ({
      itemName: i.itemName,
      pricePerUnit: i.pricePerUnit,
      quantity: i.quantity,
      total: i.total,
      vendor_id,
      vinvoice_id,
    }));
    for (const item of items) {
      const itemsRes = await fetch('/api/vendor-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!itemsRes.ok) {
        alert('Failed to save items');
        return;
      }
    }
    setShowCreateForm(false);
    setInvoiceForm({
      vendorName: '',
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      paymentStatus: 'Pending',
      paymentDate: '',
      items: [{ itemName: '', pricePerUnit: 0, quantity: 0, total: 0 }],
      cgst: 0,
      sgst: 0,
      igst: 0,
    });
    fetchData();
  };

  const columns = [
    { key: "select", label: "", minWidth: 36 },
    { key: "date", label: "Date", minWidth: 36 },
    { key: "vendor_id", label: "Vendor ID", minWidth: 30 },
    { key: "total_quantity", label: "Total Quantity", minWidth: 30 },
    { key: "totalInvoiceValue", label: "Vendor Invoice without GST", minWidth: 80 },
    { key: "cgst", label: "CGST", minWidth: 60 },
    { key: "sgst", label: "SGST", minWidth: 60 },
    { key: "igst", label: "IGST", minWidth: 60 },
    { key: "paymentStatus", label: "Status", minWidth: 80 },
     { key: "paymentDate", label: "paymentDate", minWidth: 36 },
    { key: "veshadInvoiceRefNo", label: "Veshad Invoice Ref No", minWidth: 100 },
    { key: "", label: "Action", minWidth: 100 },
  ];

  return (
    <Card className="p-4 mt-6 overflow-x-auto">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-2xl font-bold">Vendors Invoices</h2>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setShowCreateForm(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Create Invoice
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
              id="file-upload"
              disabled={uploading}
            />
          </div>
          <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDelete(selectedRows)} disabled={selectedRows.length === 0}>
            <TrashIcon className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search by Item Name..."
          value={searchItemName}
          onChange={e => setSearchItemName(e.target.value)}
          className="w-64"
        />
      </div>
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 min-w-[340px] max-w-[90vw] shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-red-600">Create Vendor Invoice</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Vendor</label>
                <select name="vendorName" value={invoiceForm.vendorName} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1 min-w-[160px]">
                  <option value="">Select Vendor</option>
                  {vendorNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Date</label>
                <input type="date" name="date" value={invoiceForm.date} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Ref No</label>
                <input name="refNo" value={invoiceForm.refNo} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Payment Status</label>
                <select name="paymentStatus" value={invoiceForm.paymentStatus} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1">
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              {invoiceForm.paymentStatus === 'Paid' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Payment Date</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={invoiceForm.paymentDate}
                    onChange={handleInvoiceFormChange}
                    className="border rounded px-2 py-1"
                  />
                </div>
              )}
            </div>
            <div className="border-t border-b border-gray-400 py-4 mb-4">
              <div className="font-bold mb-2">Items</div>
              <table className="w-full text-sm mb-2">
                <thead>
                  <tr className="text-left bg-[#4472C4]">
                    <th className="text-white">Item Name</th>
                    <th className="text-white">Quantity</th>
                    <th className="text-white">Price / Unit</th>
                    <th className="text-white">Total</th>
                    <th className="text-white"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceForm.items.map((item, idx) => (
                    <tr key={idx}>
                      <td><input name="itemName" value={item.itemName} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-32" /></td>
                      <td><input name="quantity" type="number" value={item.quantity} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-20" /></td>
                      <td><input name="pricePerUnit" type="number" value={item.pricePerUnit} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-20" /></td>
                      <td className="text-right">₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><Button size="sm" variant="destructive" type="button" onClick={() => handleRemoveItem(idx)}><TrashIcon className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="mb-2">+ Add Item</Button>
            </div>
            <div className="mb-4">
              <div>Summary:</div>
              <div>Total Qty: <b>{invoiceForm.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</b></div>
              <div>Subtotal: ₹{invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0).toFixed(2)}</div>
              <div className="flex gap-4 mt-2">
                <div>
                  IGST: <input name="igst" type="number" value={invoiceForm.igst} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1 w-16" />%
                  <span className="ml-2 text-xs text-gray-600">₹{(() => {
                    const subtotal = invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
                    return ((Number(invoiceForm.igst) || 0) * subtotal / 100).toFixed(2);
                  })()}</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    CGST: <input name="cgst" type="number" value={invoiceForm.cgst} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1 w-16" />%
                    <span className="ml-2 text-xs text-gray-600">₹{(() => {
                      const subtotal = invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
                      return ((Number(invoiceForm.cgst) || 0) * subtotal / 100).toFixed(2);
                    })()}</span>
                  </div>
                  <div>
                    SGST: <input name="sgst" type="number" value={invoiceForm.sgst} onChange={handleInvoiceFormChange} className="border rounded px-2 py-1 w-16" />%
                    <span className="ml-2 text-xs text-gray-600">₹{(() => {
                      const subtotal = invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
                      return ((Number(invoiceForm.sgst) || 0) * subtotal / 100).toFixed(2);
                    })()}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 font-bold text-red-600">Grand Total: ₹{(() => {
                const subtotal = invoiceForm.items.reduce((sum, i) => sum + (i.total || 0), 0);
                const cgst = Number(invoiceForm.cgst) || 0;
                const sgst = Number(invoiceForm.sgst) || 0;
                const igst = Number(invoiceForm.igst) || 0;
                return (subtotal + (subtotal * (cgst + sgst + igst) / 100)).toFixed(2);
              })()}</div>
            </div>
            <div className="flex gap-4 justify-end mt-4">
              <Button onClick={handleSaveInvoice} className="bg-green-600 text-white">💾 Save Invoice</Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline">Cancel</Button>
            </div>
          </div>
        </div>
      )}
      <Table className="table-auto w-full text-sm border border-black">
        <TableHeader className="border border-black">
          <TableRow className="bg-[#4472C4]">
            <TableHead className="border border-black text-center text-white" style={{ minWidth: columns[0].minWidth }}>
              <input
                type="checkbox"
                style={{
                    position: 'sticky',
                    top: 0
                }}
                ref={selectAllRef}
                checked={rows.length > 0 && selectedRows.length === rows.length}
                onChange={e => {
                  if (e.target.checked) setSelectedRows(rows.map(r => r.vinvoice_id));
                  else setSelectedRows([]);
                }}
              />
            </TableHead>
            {columns.slice(1).map((col, idx) => (
              <TableHead key={col.key} className="border border-black text-white" style={{ minWidth: col.minWidth }}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row, idx) => (
            <TableRow
              key={row.vinvoice_id}
              className={selectedRows.includes(row.vinvoice_id) ? "bg-blue-100" : ""}
              onDoubleClick={() => setEditingInvoiceId(row.vinvoice_id)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell className="border border-black text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.vinvoice_id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedRows(prev => [...prev, row.vinvoice_id]);
                    else setSelectedRows(prev => prev.filter(id => id !== row.vinvoice_id));
                  }}
                />
              </TableCell>
              {/* Render all columns from vendors_invoices table */}
              <TableCell className="border border-black">{row.date}</TableCell>
              <TableCell className="border border-black">{row.vinvoice_id}</TableCell>
              <TableCell className="border border-black text-right">{row.total_quantity}</TableCell>
              <TableCell className="border border-black text-right">{row.totalInvoiceValue}</TableCell>
              <TableCell className="border border-black text-right">{row.cgst}</TableCell>
              <TableCell className="border border-black text-right">{row.sgst}</TableCell>
              <TableCell className="border border-black text-right">{row.igst}</TableCell>
              <TableCell className="border border-black text-center">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const updated = { ...row, paymentStatus: row.paymentStatus === "Paid" ? "Pending" : "Paid" };
                    const res = await fetch(`/api/vendors-invoices/${row.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updated),
                    });
                    if (res.ok) fetchData();
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${row.paymentStatus === "Paid" ? "bg-green-500" : "bg-red-500"}`}
                  aria-pressed={row.paymentStatus === "Paid"}
                  style={{ marginRight: 8, border: 'none' }}
                  title={row.paymentStatus === "Paid" ? "Mark as Unpaid" : "Mark as Paid"}
                >
                  <span
                    className={`absolute left-0 top-0 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${row.paymentStatus === "Paid" ? "translate-x-6" : "translate-x-0"}`}
                    style={{ border: '1px solid #ccc' }}
                  />
                  <span className="sr-only">
                    {row.paymentStatus === "Paid" ? "Paid" : "Pending"}
                  </span>
                </button>
              </TableCell>
              <TableCell className="border border-black text-right">{row.paymentDate}</TableCell>
              <TableCell className="border border-black">{row.veshadInvoiceRefNo}</TableCell>
              <TableCell className="border border-black text-center">
                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setEditingInvoiceId(row.vinvoice_id); }} style={{ marginRight: 4 }}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Add Vendor Modal */}
      {vendorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-[340px] max-w-[90vw] shadow-lg">
            <h3 className="text-xl font-bold mb-4">Add Vendor</h3>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <label className="flex flex-col text-sm">
                Vendor Name
                <input name="vendorName" value={vendorForm.vendorName} onChange={handleVendorInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Contact Details
                <textarea name="contactDetails" value={vendorForm.contactDetails} onChange={handleVendorInputChange} className="border rounded px-2 py-1" />
              </label>
              <label className="flex flex-col text-sm">
                Date
                <input name="date" type="date" value={vendorForm.date} onChange={handleVendorInputChange} className="border rounded px-2 py-1" />
              </label>
            </div>
            <div className="flex gap-4 justify-end">
              <Button onClick={handleSaveVendor} className="bg-green-600 text-white">Save</Button>
              <Button onClick={() => setVendorModalOpen(false)} variant="outline">Cancel</Button>
            </div>
          </div>
        </div>
      )}
      {editingInvoiceId !== null && (
        <EditVendorInvoiceForm
          vinvoice_id={editingInvoiceId}
          onClose={() => { setEditingInvoiceId(null); fetchData(); }}
        />
      )}
    </Card>
  );
}

export function EditVendorInvoiceForm({ vinvoice_id, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  // Manual Entry value should be set programmatically, not via user input
  const [manualEntry] = useState(0); // Set value as needed from logic or props

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [invoiceRes, vendorsRes, itemsRes] = await Promise.all([
          fetch(`/api/vendors-invoices`),
          fetch(`/api/vendor-names`),
          fetch(`/api/vendor-items?vinvoice_id=${vinvoice_id}`)
        ]);
        const invoices = await invoiceRes.json();
        const vendors = await vendorsRes.json();
        setVendorList(vendors);
        const invoice = invoices.find((inv) => String(inv.vinvoice_id) === String(vinvoice_id));
        const itemsData = await itemsRes.json();
        const filteredItems = itemsData.filter(item => String(item.vinvoice_id) === String(vinvoice_id));
        setItems(filteredItems);
        if (!invoice) {
          setError("Invoice not found");
        } else {
          // Calculate subtotal for GST percentage conversion
          const subtotal = filteredItems.reduce((sum, i) => sum + (i.total || 0), 0);
          const cgstPercent = subtotal ? ((Number(invoice.cgst) || 0) * 100 / subtotal) : 0;
          const sgstPercent = subtotal ? ((Number(invoice.sgst) || 0) * 100 / subtotal) : 0;
          const igstPercent = subtotal ? ((Number(invoice.igst) || 0) * 100 / subtotal) : 0;
          setForm({
            ...invoice,
            refNo: invoice.veshadInvoiceRefNo || "",
            vendorName: vendors.find(v => v.vendor_id === invoice.vendor_id)?.vendorName || "",
            paymentDate: invoice.paymentDate || '',
            cgst: cgstPercent,
            sgst: sgstPercent,
            igst: igstPercent,
          });
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [vinvoice_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      let updated = { ...prev, [name]: value };
      if (name === 'paymentStatus' && value !== 'Paid') {
        updated.paymentDate = '';
      }
      return updated;
    });
  };

  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const newItems = [...prev];
      newItems[idx][name] = name === 'itemName' ? value : Number(value);
      if (name === 'pricePerUnit' || name === 'quantity') {
        newItems[idx].total = (newItems[idx].pricePerUnit || 0) * (newItems[idx].quantity || 0);
      }
      return newItems;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { itemName: '', pricePerUnit: 0, quantity: 0, total: 0 }]);
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Update invoice
      const vendor_id = vendorList.find(v => v.vendorName === form.vendorName)?.vendor_id || form.vendor_id;
      const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
      const cgstAmount = ((Number(form.cgst) || 0) * subtotal) / 100;
      const sgstAmount = ((Number(form.sgst) || 0) * subtotal) / 100;
      const igstAmount = ((Number(form.igst) || 0) * subtotal) / 100;
      const invoicePayload = {
        date: form.date,
        vendor_id,
        total_quantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
        totalInvoiceValue: subtotal,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        manualEntry: manualEntry,
        paymentStatus: form.paymentStatus,
        paymentDate: form.paymentStatus === "Paid" ? form.paymentDate : "", 
        veshadInvoiceRefNo: form.refNo || '',
      };
      const res = await fetch(`/api/vendors-invoices/${vinvoice_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoicePayload),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Update items: delete all and re-add
      await fetch(`/api/vendor-items?vinvoice_id=${vinvoice_id}`, { method: 'DELETE' });
      for (const item of items) {
        await fetch('/api/vendor-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, vendor_id, vinvoice_id }),
        });
      }
      alert("Invoice updated!");
      onClose();
    } catch (err) {
      setError("Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !form) return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 min-w-[340px] max-w-[90vw] shadow-lg">Loading...</div>
    </div>
  );
  if (error) return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 min-w-[340px] max-w-[90vw] shadow-lg text-red-600">{error}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 min-w-[340px] max-w-[90vw] shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Edit Vendor Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Vendor</label>
              <select name="vendorName" value={form.vendorName} onChange={handleChange} className="border rounded px-2 py-1 min-w-[160px]">
                <option value="">Select Vendor</option>
                {vendorList.map((v) => (
                  <option key={v.vendor_id} value={v.vendorName}>{v.vendorName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Ref No</label>
              <input name="refNo" value={form.refNo} onChange={handleChange} className="border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Status</label>
              <select name="paymentStatus" value={form.paymentStatus} onChange={handleChange} className="border rounded px-2 py-1">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            {form.paymentStatus === 'Paid' && (
              <div>
                <label className="block text-xs font-semibold mb-1">Payment Date</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={form.paymentDate}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                />
              </div>
            )}
          </div>
          <div className="border-t border-b border-gray-400 py-4 mb-4">
            <div className="font-bold mb-2">Items</div>
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="text-left bg-[#4472C4]">
                  <th className="text-white">Item Name</th>
                  <th className="text-white">Quantity</th>
                  <th className="text-white">Price / Unit</th>
                  <th className="text-white">Total</th>
                  <th className="text-white"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td><input name="itemName" value={item.itemName} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-32" /></td>
                    <td><input name="quantity" type="number" value={item.quantity} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-20" /></td>
                    <td><input name="pricePerUnit" type="number" value={item.pricePerUnit} onChange={e => handleItemChange(idx, e)} className="border rounded px-2 py-1 w-20" /></td>
                    <td className="text-right">{item.total?.toFixed(2) ?? '0.00'}</td>
                    <td><Button size="sm" variant="destructive" type="button" onClick={() => handleRemoveItem(idx)}>Remove</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="sm" variant="outline" type="button" onClick={handleAddItem} className="mb-2">+ Add Item</Button>
          </div>
          <div className="mb-4">
            <div>Summary:</div>
            <div>Total Qty: <b>{items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</b></div>
            <div>Subtotal: ₹{items.reduce((sum, i) => sum + (i.total || 0), 0).toFixed(2)}</div>
            <div className="flex gap-4 mt-2">
              <div>
                IGST: <input name="igst" type="number" value={form.igst} onChange={handleChange} className="border rounded px-2 py-1 w-16" />%
                <span className="ml-2 text-xs text-gray-600">₹{(() => {
                  const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
                  return ((Number(form.igst) || 0) * subtotal / 100).toFixed(2);
                })()}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  CGST: <input name="cgst" type="number" value={form.cgst} onChange={handleChange} className="border rounded px-2 py-1 w-16" />%
                  <span className="ml-2 text-xs text-gray-600">₹{(() => {
                    const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
                    return ((Number(form.cgst) || 0) * subtotal / 100).toFixed(2);
                  })()}</span>
                </div>
                <div>
                  SGST: <input name="sgst" type="number" value={form.sgst} onChange={handleChange} className="border rounded px-2 py-1 w-16" />%
                  <span className="ml-2 text-xs text-gray-600">₹{(() => {
                    const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
                    return ((Number(form.sgst) || 0) * subtotal / 100).toFixed(2);
                  })()}</span>
                </div>
              </div>
            </div>
            {/* Manual Entry input removed; value should be set programmatically. Display only if present. */}
            {manualEntry ? (
              <div className="flex items-center gap-2 mt-4">
                <span className="font-semibold text-sm">Manual Entry:</span>
                <span className="text-base font-bold">₹{manualEntry.toFixed(2)}</span>
                <span className="text-xs text-gray-600">(Included in Grand Total, not in GST)</span>
              </div>
            ) : null}
            <div className="mt-2 font-bold text-red-600">Grand Total: ₹{(() => {
              const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
              const cgst = Number(form.cgst) || 0;
              const sgst = Number(form.sgst) || 0;
              const igst = Number(form.igst) || 0;
              return (subtotal + (subtotal * (cgst + sgst + igst) / 100) + manualEntry).toFixed(2);
            })()}</div>
          </div>
          <div className="flex gap-4 justify-end mt-4">
            <Button type="submit" className="bg-green-600 text-white">💾 Save Invoice</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
