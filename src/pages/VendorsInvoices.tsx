import React, { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, TrashIcon, UploadIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { time } from "console";

const emptyInvoice = {
  id: 0,
  date: new Date().toISOString().split("T")[0],
  vendorName: "",
  itemName: "",
  totalInvoiceValue: 0,
  cgst : 0,
  sgst: 0,  
  igst: 0,
  paymentStatus: "Pending",
  veshadInvoiceRefNo: "",
  veshadInvoiceValue: 0,
  veshadSgst: 0,
  veshadCgst: 0,
  veshadIgst: 0,
};

export default function VendorsInvoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(emptyInvoice);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const res = await fetch("/api/vendors-invoices");
    const data = await res.json();
    setRows(data);
  };

  useEffect(() => { fetchData(); }, []);

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

  const handleAdd = () => {
    setEditData(emptyInvoice);
    setEditIdx(null);
    setIsAdding(true);
  };

  const handleEdit = (idx: number) => {
    setEditData(rows[idx]);
    setEditIdx(idx);
    setIsAdding(true);
  };

  const handleSave = async () => {
    const method = editIdx === null ? "POST" : "PUT";
    const url = editIdx === null
      ? "/api/vendors-invoices"
      : `/api/vendors-invoices/${rows[editIdx].id}`;
    let payload = (editData);
    if (method === "PUT") {
      (payload as any).id = rows[editIdx].id;
    }
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Save failed");
      return;
    }
    setIsAdding(false);
    await fetchData();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let key = name;
    if (name === "vendor_name") key = "vendorName";
    if (name === "item_name") key = "itemName";
    if (name === "total_invoice_value") key = "totalInvoiceValue";
    setEditData((prev: any) => ({
      ...prev,
      [key]: key.endsWith("Value") || ["cgst","sgst","igst","veshadSgst","veshadCgst","veshadIgst"].includes(key) ? Number(value) : value
    }));
  };

  const columns = [
    { key: "select", label: "", minWidth: 36 },
    { key: "date", label: "Date", minWidth: 36 },
    { key: "vendorName", label: "Vendor Name", minWidth: 100 },
    { key: "itemName", label: "Item Name", minWidth: 100 },
    { key: "totalInvoiceValue", label: "Vendor Invoice without GST", minWidth: 80 },
    { key: "cgst", label: "CGST", minWidth: 60 },
    { key: "sgst", label: "SGST", minWidth: 60 },
    { key: "igst", label: "IGST", minWidth: 60 },
    { key: "paymentStatus", label: "Status", minWidth: 80 },
    { key: "veshadInvoiceRefNo", label: "Veshad Invoice Ref No", minWidth: 100 },
    { key: "veshadInvoiceValue", label: "Veshad Invoice without GST", minWidth: 80 },
    { key: "veshadSgst", label: "Veshad SGST", minWidth: 60 },
    { key: "veshadCgst", label: "Veshad CGST", minWidth: 60 },
    { key: "veshadIgst", label: "Veshad IGST", minWidth: 60 },
    { key: "actions", label: "Actions", minWidth: 80 },
  ];

  return (
    <Card className="p-4 mt-6 overflow-x-auto">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-2xl font-bold">Vendors Invoices</h2>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-black text-white hover:bg-gray-800" onClick={handleAdd}>
            <PlusIcon className="w-4 h-4 mr-1" /> Add Invoice
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
            <Button asChild disabled={uploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <>
                    <UploadIcon className="h-4 w-4 animate-spin mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2" /> Import File
                  </>
                )}
              </label>
            </Button>
          </div>
          <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDelete(selectedRows)} disabled={selectedRows.length === 0}>
            <TrashIcon className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>
      <Table className="table-auto w-full text-sm border border-black">
        <TableHeader className="border border-black">
          <TableRow>
            <TableHead className="border border-black text-center" style={{ minWidth: columns[0].minWidth }}>
              <input
                type="checkbox"
                style={{
                    position: 'sticky',
                    top: 0
                }}
                ref={selectAllRef}
                checked={rows.length > 0 && selectedRows.length === rows.length}
                onChange={e => {
                  if (e.target.checked) setSelectedRows(rows.map(r => r.id));
                  else setSelectedRows([]);
                }}
              />
            </TableHead>
            {columns.slice(1).map((col, idx) => (
              <TableHead key={col.key} className="border border-black" style={{ minWidth: col.minWidth }}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.id} className={selectedRows.includes(row.id) ? "bg-blue-100" : ""}>
              <TableCell className="border border-black text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedRows(prev => [...prev, row.id]);
                    else setSelectedRows(prev => prev.filter(id => id !== row.id));
                  }}
                />
              </TableCell>
              <TableCell className="border border-black">{row.date}</TableCell>
              <TableCell className="border border-black">{row.vendorName}</TableCell>
              <TableCell className="border border-black">{row.itemName}</TableCell>
              <TableCell className="border border-black text-right">{row.totalInvoiceValue}</TableCell>
              <TableCell className="border border-black text-right">{row.cgst}</TableCell>
              <TableCell className="border border-black text-right">{row.sgst}</TableCell>
              <TableCell className="border border-black text-right">{row.igst}</TableCell>
              <TableCell className="border border-black text-center">
                <button
                  onClick={async () => {
                    const updated = { ...row, paymentStatus: row.paymentStatus === "Paid" ? "Pending" : "Paid" };
                    const res = await fetch(`/api/vendors-invoices/${row.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updated),
                    });
                    if (res.ok) fetchData();
                  }}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                    row.paymentStatus === "Paid" ? "bg-green-500" : "bg-red-500"
                  }`}
                  aria-pressed={row.paymentStatus === "Paid"}
                  style={{ marginRight: 8, border: 'none' }}
                  title={row.paymentStatus === "Paid" ? "Mark as Unpaid" : "Mark as Paid"}
                >
                  <span
                    className={`absolute left-0 top-0 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                      row.paymentStatus === "Paid" ? "translate-x-6" : "translate-x-0"
                    }`}
                    style={{ border: '1px solid #ccc' }}
                  />
                  <span className="sr-only">
                    {row.paymentStatus === "Paid" ? "Paid" : "Pending"}
                  </span>
                </button>
              </TableCell>
              <TableCell className="border border-black">{row.veshadInvoiceRefNo}</TableCell>
              <TableCell className="border border-black text-right">{row.veshadInvoiceValue}</TableCell>
              <TableCell className="border border-black text-right">{row.veshadSgst}</TableCell>
              <TableCell className="border border-black text-right">{row.veshadCgst}</TableCell>
              <TableCell className="border border-black text-right">{row.veshadIgst}</TableCell>
              <TableCell className="border border-black text-center">
                <Button size="sm" variant="outline" onClick={() => handleEdit(idx)} style={{ marginRight: 4 }}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Add/Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-[340px] max-w-[90vw] shadow-lg">
            <h3 className="text-xl font-bold mb-4">{editIdx === null ? "Add Vendor Invoice" : "Edit Vendor Invoice"}</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex flex-col text-sm">Date<input name="date" value={editData.date} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Vendor Name<input name="vendor_name" value={editData.vendorName} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Item Name<input name="item_name" value={editData.itemName} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Total Invoice Value<input name="total_invoice_value" type="number" value={editData.total_invoice_value} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">CGST<input name="cgst" type="number" value={editData.cgst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">SGST<input name="sgst" type="number" value={editData.sgst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">IGST<input name="igst" type="number" value={editData.igst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Status<select name="paymentStatus" value={editData.paymentStatus} onChange={handleInputChange} className="border rounded px-2 py-1"><option value="Pending">Pending</option><option value="Paid">Paid</option></select></label>
              <label className="flex flex-col text-sm">Veshad Invoice Ref No<input name="veshadInvoiceRefNo" value={editData.veshadInvoiceRefNo} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Veshad Invoice Value<input name="veshadInvoiceValue" type="number" value={editData.veshadInvoiceValue} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Veshad SGST<input name="veshadSgst" type="number" value={editData.veshadSgst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Veshad CGST<input name="veshadCgst" type="number" value={editData.veshadCgst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
              <label className="flex flex-col text-sm">Veshad IGST<input name="veshadIgst" type="number" value={editData.veshadIgst} onChange={handleInputChange} className="border rounded px-2 py-1" /></label>
            </div>
            <div className="flex gap-4 justify-end">
              <Button onClick={handleSave} className="bg-green-600 text-white">Save</Button>
              <Button onClick={() => setIsAdding(false)} variant="outline">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function timmestampToDate(arg0: number) {
  throw new Error("Function not implemented.");
}
