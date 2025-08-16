"use client";


import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";


import {
 DownloadIcon,
 UploadIcon,
 TrashIcon,
 PlusIcon,
} from "lucide-react";


import { useEffect, useRef, useState } from "react";
import { formatDateDDMMMYYYY } from "../lib/utils";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";


type Purchase = {
 slNo: string;
 date: string;
 description: string;
 credit: number | null;
 debit: number | null;
 bankPaymentRef?: string;
 clientName?: string;
 paymentRemarks?: string;
 refBankName?: string;
 invoiceNo?: string;
 inputCgst?: number | string;
 inputSgst?:  number | string;
 inputIgst?: number | string;
 created_at?: string;
};


// Simple toast implementation using window.alert as a fallback
function toast({ title, description }: { title: string; description: string }) {
 window.alert(`${title}\n\n${description}`);
}


export default function Purchases() {
 const [purchases, setPurchases] = useState<Purchase[]>([]);
 const [selectedMonth, setSelectedMonth] = useState<string>("");
 const [searchTerm, setSearchTerm] = useState<string>("");
 const [uploading, setUploading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [isAdding, setIsAdding] = useState(false);
 const [editData, setEditData] = useState<Purchase | null>(null);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [isSaving, setIsSaving] = useState(false);
 const [selectAllRows, setSelectAllRows] = useState(false);
 const [selectedRows, setSelectedRows] = useState<number[]>([]);
 const [loading, setLoading] = useState(true);


 const [openAdd, setOpenAdd] = useState(false);
 const [openImport, setOpenImport] = useState(false);
 const [selectedColIdx, setSelectedColIdx] = useState<number | null>(null);
 const emptyPurchase: Purchase = {
   slNo: '',
   date: formatDateDDMMMYYYY(new Date()),
   description: '',
   credit: null,
   debit: null,
   bankPaymentRef: '',
   clientName: '',
   paymentRemarks: '',
   refBankName: '',
   invoiceNo: '',
   inputCgst: '',
   inputSgst: '',
   inputIgst: '', 
 };


 // Add a select column as the first column
 const columns = [
   { key: 'select', label: '', minWidth: 36, maxWidth: 36, align: 'center' },
   { key: 'slNo', label: 'Sl No', minWidth: 60, maxWidth: 80, align: 'center' },
   { key: 'date', label: 'Date', minWidth: 140, maxWidth: 160, align: 'center' },
   { key: 'description', label: 'Description', minWidth: 300, maxWidth: 800, align: 'center' },
   { key: 'credit', label: 'Credit', minWidth: 150, maxWidth: 220, align: 'center' },
   { key: 'debit', label: 'Debit', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'bankPaymentRef', label: 'Bank Payment Ref', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'clientName', label: 'Client Name', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'paymentRemarks', label: 'Payment Remarks', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'refBankName', label: 'Ref Bank Name', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'invoiceNo', label: 'Invoice No', minWidth: 150, maxWidth: 220, align: 'center' },
    { key: 'inputCgst', label: 'CGST', minWidth: 100, maxWidth: 150, align: 'center' },
    { key: 'inputSgst', label: 'SGST', minWidth: 100, maxWidth: 150, align: 'center' },
    { key: 'inputIgst', label: 'IGST', minWidth: 100, maxWidth: 150, align: 'center' },
    { key: 'created_at', label: 'created_at', minWidth: 140, maxWidth: 160, align: 'center' },
 ];


 const [columnWidths] = useState<{ [key: string]: number }>(() => {
   const widths: { [key: string]: number } = {};
   columns.forEach(col => {
     widths[col.key] = col.minWidth;
   });
   return widths;
 });


 // Add draggingCol state to fix the error
 const [draggingCol, setDraggingCol] = useState<string | null>(null);


 const fileInputRef = useRef<HTMLInputElement>(null);


 useEffect(() => {
   fetchData();
 }, []);


 const fetchData = async () => {
   try {
     const res = await fetch("/api/purchases");
     const result = await res.json();
     const data = Array.isArray(result)
       ? result
       : result.data || result.rows || [];

     const mapped: Purchase[] = data.map((item: any) => ({
       slNo: String(item.slNo ?? ""),
       date: String(item.date ?? ""),
       description: String(item.description ?? ""),
       credit: item.credit ?? 0,
       debit: item.debit ?? 0,
       bankPaymentRef: String(item.bankPaymentRef ?? ""),
       clientName: String(item.clientName ?? ""),
       paymentRemarks: String(item.paymentRemarks ?? ""),
       refBankName: String(item.refBankName ?? ""),
       invoiceNo: String(item.invoiceNo ?? ""),
       inputCgst: String(item.inputCgst ?? ""),
       inputSgst: String(item.inputSgst ?? ""),
       inputIgst: String(item.inputIgst ?? ""),
       created_at: String(item.created_at ?? ""),
     }));


     setPurchases(mapped);
   } catch (err) {
     console.error("Failed to load purchases:", err);
   }
};


const months = Array.from(
 new Set(
   purchases.map((p) => {
     const date = new Date(p.date);
     return date.toLocaleString("default", { month: "long", year: "numeric" });
   })
 )
);


 const filteredData = purchases
 .filter((p) => {
   const date = new Date(p.date);
   const monthLabel = date.toLocaleString("default", {
     month: "long",
     year: "numeric",
   });


   const matchesMonth = selectedMonth ? monthLabel === selectedMonth : true;
   const matchesSearch = searchTerm.trim()
  ? (typeof p.description === 'string' && p.description.toLowerCase().includes(searchTerm.trim().toLowerCase()))
  : true;


   return matchesMonth && matchesSearch;
 })
 .sort((a, b) => Number(b.slNo) - Number(a.slNo)); // 🔽 Descending by slNo




 const totalCredit = filteredData.reduce((sum, p) => sum + (p.credit ?? 0), 0);
 const totalDebit = filteredData.reduce((sum, p) => sum + (p.debit ?? 0), 0);


 const exportToCSV = () => {
   const header = [
     "Sl No",
     "Date",
     "Description",
     "Credit",
     "Debit",
     "bankPaymentRef",
     "clientName",
     "paymentRemarks",
     "refBankName",
     "invoiceNo",
     "inputCgst",
     "inputSgst",
     "inputIgst",
     "created_at",
   ];


   const rows = filteredData.map((p) => [
     p.slNo,
     formatDateDDMMMYYYY(p.date),
     `"${p.description}"`,
     p.credit ?? 0,
     p.debit ?? 0,
     p.bankPaymentRef ?? "",
     p.clientName ?? "",
     p.paymentRemarks ?? "",
     p.refBankName ?? "",
     p.invoiceNo ?? "",
     p.inputCgst ?? "",
     p.inputSgst ?? "",
     p.inputIgst ?? "",
     p.created_at ?? "",
   ]);


   const csvContent =
     "data:text/csv;charset=utf-8," +
     [header, ...rows].map((e) => e.join(",")).join("\n");


   const encodedUri = encodeURI(csvContent);
   const link = document.createElement("a");
   link.setAttribute("href", encodedUri);
   link.setAttribute("download", "purchases.csv");
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
 };


 const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });


 const handleSaveNew = async () => {
    if (!editData) return;

    try {
      setIsSaving(true);
      const dataToSend = {
        ...editData,
        date: formatDateDDMMMYYYY(editData.date),
        credit: editData.credit,
        debit: editData.debit
      };

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || 'Failed to add transaction');
      }

      await fetchData(); // Reload the table
      setIsAdding(false);
      setEditData(null);
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to add transaction";
      setError(errMsg);
      toast({
        title: "Error",
        description: errMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  function formatForInput(dateString: string) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return ""; // if invalid date
  return d.toISOString().split("T")[0]; // yyyy-mm-dd
}

  const handleInputChange = (field: keyof Purchase, value: string) => {
    if (!editData) return;

    let processedValue: string | number | null = value;
    
    // Handle number fields
    if (field === 'credit' || field === 'debit') {
      processedValue = value === '' ? null :(value);
    }

    setEditData({
      ...editData,
      [field]: processedValue,
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditData(emptyPurchase);
  };


 async function handleAddNew() {
  try {
    const res = await fetch("http://localhost:4000/api/purchases/max-slno");
    const data = await res.json();
    const nextSlNo = (data.maxSlNo || 0) + 1;

    setEditData({
      slNo: String(nextSlNo), // auto-filled
      date: "",
      description: "",
      credit: null,
      debit: null,
      bankPaymentRef: "",
      clientName: "",
      paymentRemarks: "",
      refBankName: "",
      invoiceNo: "",
      inputCgst: 0,
      inputSgst: 0,
      inputIgst: 0,
    });
    setEditingId(null);
    setIsAdding(true);
  } catch (err) {
    console.error("Failed to fetch max slNo:", err);
  }
}


 const getSortedPurchases = () => {
   const sorted = [...purchases];
   sorted.sort((a, b) => {
     let aVal = a[sortConfig.key];
     let bVal = b[sortConfig.key];
     if (sortConfig.key === 'date') {
       aVal = new Date(aVal);
       bVal = new Date(bVal);
     }
     if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
     if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
     return 0;
   });
   return sorted.map((p, idx, arr) => ({ ...p, serial: arr.length - idx }));
 };
 const sortedPurchases = getSortedPurchases();


 const downloadPurchases = () => {
   let purchasesToExport: typeof purchases = [];
   if (typeof getSortedPurchases === 'function') {
     purchasesToExport = getSortedPurchases();
   } else if (Array.isArray(purchases)) {
     purchasesToExport = purchases;
   }
   if (!purchasesToExport.length) {
     toast({ title: 'No data', description: 'No purchases to export.' });
     return;
   }
   purchasesToExport = purchasesToExport.sort((a, b) => parseInt(b.slNo) - parseInt(a.slNo));

   const data = purchasesToExport.map(p => ({
     'SL No': p.slNo,
     'Date': p.date,
     'Description': p.description,
     'Credit': p.credit,
     'Debit': p.debit,
     'Bank Payment Ref': p.bankPaymentRef,
     'Client Name': p.clientName,
     'Payment Remarks': p.paymentRemarks,
     'Ref Bank Name': p.refBankName,
     'Invoice No': p.invoiceNo,
     'CGST': p.inputCgst,
     'SGST': p.inputSgst,
     'IGST': p.inputIgst,
     'Created At': p.created_at ?? ''
   }));
   try {
     const ws = XLSX.utils.json_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
     XLSX.writeFile(wb, 'purchases.xlsx');
   } catch (err) {
     toast({ title: 'Export Error', description: err instanceof Error ? err.message : 'Failed to export purchases' });
   }
 };


 const handleEdit = (purchase: Purchase) => {
   setEditingId(purchase.slNo ? parseInt(purchase.slNo, 10) : null);
   setEditData(purchase);
 };


 const handleCancelEdit = () => {
   setEditingId(null);
   setEditData(null);
 };


 const handleSave = async (purchase: Purchase) => {
   try {
     setIsSaving(true);
     const dataToSend = { ...purchase, date: formatDateDDMMMYYYY(purchase.date) };
     const response = await fetch(`/api/purchases/${purchase.slNo}`, {
       method: 'PUT',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(dataToSend),
     });


     if (!response.ok) {
       throw new Error('Failed to update transaction');
     }


     toast({
       title: "Success",
       description: "Transaction updated successfully",
     });


     await fetchData(); // Ensure table is refreshed from DB
     setEditingId(null);
     setEditData(null);
   } catch (err) {
     const errMsg = err instanceof Error ? err.message : 'Failed to update transaction';
     setError(errMsg);
     toast({
       title: "Error",
       description: errMsg,
     });
   } finally {
     setIsSaving(false);
   }
 };


 const handleDelete = async (slNo: number) => {
   if (!window.confirm('Are you sure you want to delete this transaction?')) {
     return;
   }


   try {
     const response = await fetch(`/api/purchases/${slNo}`, {
       method: 'DELETE',
     });


     if (!response.ok) {
       throw new Error('Failed to delete transaction');
     }


     toast({
       title: "Success",
       description: "Transaction deleted successfully",
     });


     fetchData(); // Reload the data
   } catch (err) {
     const errMsg = err instanceof Error ? err.message : 'Failed to delete transaction';
     setError(errMsg);
     toast({
       title: "Error",
       description: errMsg,
     });
   }
 };


 // Batch delete selected rows
 const handleBatchDelete = async () => {
   if (selectedRows.length === 0) return;
   if (!window.confirm(`Delete ${selectedRows.length} selected transaction(s)?`)) return;
   try {
     await Promise.all(selectedRows.map(slNo => fetch(`/api/purchases/${slNo}`, { method: 'DELETE' })));
     setSelectedRows([]);
     await fetchData();
     toast({ title: 'Deleted', description: 'Selected transactions deleted.' });
   } catch (err) {
     toast({ title: 'Delete Error', description: err instanceof Error ? err.message : 'Failed to delete' });
   }
 };


 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
   const file = event.target.files?.[0];
   if (!file) return;


   try {
     setUploading(true);
     setError(null);


     const formData = new FormData();
     formData.append('file', file);


     const response = await fetch('/api/purchases/import', {
       method: 'POST',
       body: formData,
     });


     const contentType = response.headers.get("content-type");
     const data = contentType?.includes("application/json")
       ? await response.json()
       : { error: 'Server error', details: await response.text(), count: 0 };


     if (!response.ok) {
       let errorMessage = 'Failed to import data';
       if (data.details) {
         errorMessage = Array.isArray(data.details) ? data.details.join('\n') : data.details;
       }
       throw new Error(errorMessage);
     }


     const importedCount = data.count ?? 0;
     toast({
       title: "Success",
       description: `Successfully imported ${importedCount} transactions`,
     });
    
     fetchData();
   } catch (err) {
     console.error('Error uploading file:', err);
     const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
     setError(errorMessage);
     toast({
       title: "Import Error",
       description: errorMessage,
     });
   } finally {
     setUploading(false);
     event.target.value = '';
   }
 };


 // Helper: get column widths in px
const getColWidths = () => columns.map(col => col.minWidth + 'px');
const colWidths = getColWidths();
const scrollbarWidth = 16; // px, adjust if needed for your OS/browser

 return (
   <Card className="p-4 mt-6">
     {/* Header Toolbar */}
     <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
       <h2 className="text-2xl font-bold">Purchases</h2>


       <div className="flex flex-wrap gap-2">
         <Button className="bg-black text-white hover:bg-gray-800" onClick={handleAddNew}>
           <PlusIcon className="w-4 h-4 mr-1" /> Add Transaction
         </Button>


         <Button onClick={downloadPurchases} variant="outline">
           <DownloadIcon className="w-4 h-4 mr-2" /> Download
         </Button>
         <div className="relative">
           <input
             type="file"
             accept=".xlsx,.xls,.csv"
             onChange={handleFileUpload}
             className="hidden"
             id="file-upload"
             disabled={uploading}
           />
         {/* <Button
             asChild
             disabled={uploading}
           >
             <label htmlFor="file-upload" className="cursor-pointer">
               {uploading ? (
                 <>
                   <UploadIcon className="h-4 w-4 animate-spin mr-2" />
                   Uploading...
                 </>
               ) : (
                 <>
                   <UploadIcon className="h-4 w-4 mr-2" />
                   Import File
                 </>
               )}
             </label>
           </Button> */}
         </div>
         <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleBatchDelete} disabled={selectedRows.length === 0}>
           <TrashIcon className="w-4 h-4 mr-2" /> Delete
         </Button>
       </div>
     </div>


     {/* Filter Section */}
     <div className="flex flex-wrap gap-2 mb-4">
       <select
         value={selectedMonth}
         onChange={(e) => setSelectedMonth(e.target.value)}
         className="border rounded px-2 py-1 text-sm"
       >
         <option value="">All Months</option>
         {months.map((month) => (
           <option key={month} value={month}>
             {month}
           </option>
         ))}
       </select>


       <Input
         placeholder="Search Description..."
         value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="w-64"
       />
     </div>


     {/* Table with static header and scrollable body */}
    <div style={{ maxHeight: 600, overflow: 'auto', width: '100%' }}>
        <table className="table-auto text-sm border border-black" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead className="bg-white">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: selectedColIdx === idx ? '#dbeafe' : '#fff',
                    cursor: 'pointer',
                    zIndex: 5,
                    border: '1px solid black',
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    padding: '4px'
                  }}
                  className="text-base text-center"
                >
                  {col.key === 'select' ? (
                    <input
                      type="checkbox"
                      checked={selectAllRows}
                      onChange={e => {
                        setSelectAllRows(e.target.checked);
                        setSelectedRows(
                          e.target.checked
                            ? filteredData.map(p => parseInt(p.slNo, 10)).filter(n => !isNaN(n))
                            : []
                        );
                      }}
                      title="Select all rows"
                    />
                  ) : (
                    <span className="text-base">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Totals row */}
            <tr>
              <td colSpan={4} className="font-bold text-right border border-black">
                Total
              </td>
              <td className="text-right font-bold bg-green-200 border border-black">
                ₹ {totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td className="text-right font-bold bg-yellow-200 border border-black">
                ₹ {totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              {/* Fill remaining columns */}
              {columns.length > 6 && Array.from({ length: columns.length - 6 }).map((_, i) => (
                <td key={i} className="border border-black"></td>
              ))}
            </tr>

            {/* Data rows */}
            {filteredData.map((p) => (
              <tr key={p.slNo}
                style={{
                  backgroundColor: p.credit ? "#d1fad1" : p.debit ? "#fff3b0" : "transparent"
                }}
              >
                {/* Checkbox */}
                <td className="border border-black text-center" align="center">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(parseInt(p.slNo, 10))}
                    onChange={e => {
                      const slNo = parseInt(p.slNo, 10);
                      if (e.target.checked) {
                        setSelectedRows(prev => [...prev, slNo]);
                      } else {
                        setSelectedRows(prev => prev.filter(n => n !== slNo));
                      }
                    }}
                  />
                </td>

                {/* Other cells */}
                <td className="border border-black"  align="center" onDoubleClick={() => handleEdit(p)}>{p.slNo}</td>
                <td className="border border-black"  align="center" onDoubleClick={() => handleEdit(p)}>{formatDateDDMMMYYYY(p.date)}</td>
                <td className="border border-black" onDoubleClick={() => handleEdit(p)}>{p.description}</td>
                <td className="text-left border border-black"  align="center" onDoubleClick={() => handleEdit(p)}>
                  {p.credit?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="text-left border border-black"  align="center" onDoubleClick={() => handleEdit(p)}>
                  {p.debit?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-black" onDoubleClick={() => handleEdit(p)}>{p.bankPaymentRef}</td>
                <td className="border border-black" onDoubleClick={() => handleEdit(p)}>{p.clientName}</td>
                <td className="border border-black" onDoubleClick={() => handleEdit(p)}>{p.paymentRemarks}</td>
                <td className="text-center border border-black" onDoubleClick={() => handleEdit(p)}>{p.refBankName}</td>
                <td className="text-left border border-black" align="center" onDoubleClick={() => handleEdit(p)}>{p.invoiceNo}</td>
                <td className="border border-black" align="center" onDoubleClick={() => handleEdit(p)}>{p.inputCgst}</td>
                <td className="border border-black" align="center" onDoubleClick={() => handleEdit(p)}>{p.inputSgst}</td>
                <td className="border border-black" align="center" onDoubleClick={() => handleEdit(p)}>{p.inputIgst}</td>
                <td className="border border-black" onDoubleClick={() => handleEdit(p)}>{p.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


     {/* Edit/Add Modal */}
     <Dialog open={!!editData || isAdding} onOpenChange={(open) => { if (!open) { setEditData(null); setEditingId(null); setIsAdding(false); } }}>
        <DialogContent className="max-w-xs p-4">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Purchase' : 'Add Purchase'}</DialogTitle>
          </DialogHeader>
          {editData && (
            <form onSubmit={e => {
              e.preventDefault();
              if (!editData) return;
              if (editingId) {
                handleSave(editData);
              } else {
                handleSaveNew();
              }
            }}>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs flex flex-col">Sl No
                  <Input className="h-7 text-xs" value={editData.slNo} onChange={e => setEditData({ ...editData, slNo: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Date
                  <Input className="h-7 text-xs" type="date" value={formatForInput(editData.date)} onChange={e => setEditData({ ...editData, date: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col col-span-2">Description
                  <Textarea className="min-h-[40px] text-xs" value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Credit
                  <Input className="h-7 text-xs" type="number" value={editData.credit ?? ''} onChange={e => setEditData({ ...editData, credit: e.target.value === '' ? null : Number(e.target.value) })} />
                </label>
                <label className="text-xs flex flex-col">Debit
                  <Input className="h-7 text-xs" type="number" value={editData.debit ?? ''} onChange={e => setEditData({ ...editData, debit: e.target.value === '' ? null : Number(e.target.value) })} />
                </label>
                <label className="text-xs flex flex-col">Bank Payment Ref
                  <Input className="h-7 text-xs" value={editData.bankPaymentRef} onChange={e => setEditData({ ...editData, bankPaymentRef: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Client Name
                  <Input className="h-7 text-xs" value={editData.clientName} onChange={e => setEditData({ ...editData, clientName: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Payment Remarks
                  <Input className="h-7 text-xs" value={editData.paymentRemarks} onChange={e => setEditData({ ...editData, paymentRemarks: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Ref Bank Name
                  <Input className="h-7 text-xs" value={editData.refBankName} onChange={e => setEditData({ ...editData, refBankName: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Invoice No
                  <Input className="h-7 text-xs" value={editData.invoiceNo} onChange={e => setEditData({ ...editData, invoiceNo: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Input CGST
                  <Input className="h-7 text-xs" type="number" value={editData.inputCgst ?? ''} onChange={e => setEditData({ ...editData, inputCgst: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Input SGST
                  <Input className="h-7 text-xs" type="number" value={editData.inputSgst ?? ''} onChange={e => setEditData({ ...editData, inputSgst: e.target.value })} />
                </label>
                <label className="text-xs flex flex-col">Input IGST
                  <Input className="h-7 text-xs" type="number" value={editData.inputIgst ?? ''} onChange={e => setEditData({ ...editData, inputIgst: e.target.value })} />
                </label>
              </div>
              <DialogFooter className="mt-2">
                <Button type="submit" size="sm" disabled={isSaving}>{isSaving ? 'Saving...' : (editingId ? 'Save' : 'Add')}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditData(null); setEditingId(null); setIsAdding(false); }}>Cancel</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}












