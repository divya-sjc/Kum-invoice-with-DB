import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVendorInvoices } from "@/hooks/use-vendor-invoices";
import { calculateProfitMargin } from "@/types/vendorInvoice";

const headers = [
  "Vendors Name",
  "Item Name Briefly",
  "Total Invoice Value",
  "CGST",
  "SGST",
  "IGST",
  "STATUS OF PAYMENT",
  "Veshad Invoice Ref No",
  "Veshad Invoice Value",
  "Veshad SGST",
  "Veshad CGST",
  "Veshad IGST",
  "Profit %",
  "Lock",
  "Delete"
];

const VendorsInv = () => {
  const {
    rows,
    loading,
    saving,
    error,
    addRow,
    removeRow,
    toggleLock,
    handleChange,
    handleSave
  } = useVendorInvoices();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Vendors INV</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto relative">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading vendor invoices...</span>
          </div>
        ) : (
          <>
            <table className="min-w-full border border-gray-300 rounded-lg table-auto" style={{ borderSpacing: '2px', width: '100%' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-1 py-1 text-left whitespace-nowrap">#</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Date</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Vendor Name</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Description</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Amount (Credit)</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Invoice Ref</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Invoice#</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">CGST</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">SGST</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">IGST</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Profit %</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Lock</th>
                  <th className="px-1 py-1 text-left whitespace-nowrap">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const netProfitMargin = calculateProfitMargin(row);
                  return (
                    <tr key={idx} className={row.locked ? "bg-gray-200" : ""}>
                      <td className="px-1 text-center align-middle">{idx + 1}</td>
                      <td className="px-1 text-center align-middle">
                        <input disabled={row.locked} value={row.createdAt || ''} onChange={e => handleChange(idx, "createdAt", e.target.value)} className="w-full" />
                      </td>
                      <td className="px-1 text-center align-middle">
                        <input disabled={row.locked} value={row.vendorName || ''} onChange={e => handleChange(idx, "vendorName", e.target.value)} className="w-full" />
                      </td>
                      <td className="px-1 text-center align-middle">
                        <input disabled={row.locked} value={row.itemName || ''} onChange={e => handleChange(idx, "itemName", e.target.value)} className="w-full" />
                      </td>
                      <td className="px-1 align-middle text-right">
                        <input disabled={row.locked} type="number" value={row.totalInvoiceValue ?? ''} onChange={e => handleChange(idx, "totalInvoiceValue", Number(e.target.value))} className="w-full text-right" />
                      </td>
                      <td className="px-1 text-center align-middle">
                        <input disabled={row.locked} value={row.veshadInvoiceRefNo || ''} onChange={e => handleChange(idx, "veshadInvoiceRefNo", e.target.value)} className="w-full" />
                      </td>
                      <td className="px-1 text-center align-middle">
                        <input disabled={row.locked} value={row.invoiceNumber || ''} onChange={e => handleChange(idx, "invoiceNumber", e.target.value)} className="w-full" />
                      </td>
                      <td className="px-1 align-middle text-right">
                        <input disabled={row.locked} type="number" value={row.cgst ?? ''} onChange={e => handleChange(idx, "cgst", Number(e.target.value))} className="w-full text-right" />
                      </td>
                      <td className="px-1 align-middle text-right">
                        <input disabled={row.locked} type="number" value={row.sgst ?? ''} onChange={e => handleChange(idx, "sgst", Number(e.target.value))} className="w-full text-right" />
                      </td>
                      <td className="px-1 align-middle text-right">
                        <input disabled={row.locked} type="number" value={row.igst ?? ''} onChange={e => handleChange(idx, "igst", Number(e.target.value))} className="w-full text-right" />
                      </td>
                      <td className={`font-bold text-center ${netProfitMargin > 100 ? 'bg-yellow-200 text-black' : netProfitMargin > 0 ? 'text-green-600' : netProfitMargin < 0 ? 'text-red-600' : ''}`}>{netProfitMargin.toFixed(2)}%</td>
                      <td className="text-center">
                        <button 
                          onClick={() => toggleLock(idx)} 
                          disabled={saving || !row.id} 
                          title={!row.id ? 'Save the row first' : undefined}
                          className={`px-2 py-1 rounded ${
                            row.locked ? 'bg-blue-400 text-white' : 'bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90`}
                        >
                          {row.locked ? 'Unlock' : 'Lock'}
                        </button>
                      </td>
                      <td className="text-center">
                        <button 
                          onClick={() => removeRow(idx)} 
                          disabled={saving || row.locked} 
                          title={row.locked ? 'Unlock first to delete' : undefined}
                          className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-between mt-4">
              <button 
                onClick={addRow} 
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50" 
                disabled={saving}
              >
                Add Row
              </button>
              <button 
                onClick={handleSave} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50" 
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </span>
                ) : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VendorsInv;
