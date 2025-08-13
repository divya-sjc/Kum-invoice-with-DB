import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, FileText, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { getInvoices, handleDelete } from "@/utils/invoiceStorage";
import { useState, useEffect, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Lazy load the InvoiceStatusTab component
const InvoiceStatusTab = lazy(() => import('@/components/InvoiceStatusTab'));

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  revision: number;
  gst: string;
  deliveryAddress_name: string;
  deliveryAddress_address: string;
  deliveryAddress_city: string;
  deliveryAddress_postalCode: string;
  deliveryAddress_state: string;
  deliveryDate: string;
  deliveryChallanRef: string;
  hsnSac: string;
  poRefNo: string;
  paymentReceived: number;
  balanceDue: number;
  totalNet: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus?: 'Paid' | 'Pending';
  paymentBank?: string; 
  paymentRecvdDate?: string; 
  paymentBankRef?: string; 
  paymentDate?: string; 
  ewayBillRef?: string; 
  items?: {
    id: number;
    item_description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];  
  supplier: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone: string;
    email: string;
  };
  veshadCgst: number;
  veshadSgst: number;
  veshadIgst: number;
  notes?: string;
  vendor_id?: number;
  profitPercent?: number;
}

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { toast } = useToast(); // Use toast as a function
  const [originalInvoices, setOriginalInvoices] = useState<Invoice[]>([]);
  // New state for month selection and GST
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [gstDetails, setGstDetails] = useState<{ veshadCgst: number; veshadSgst: number; veshadIgst: number } | null>(null);
  const [editPaymentInvoice, setEditPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentReceived: 0,
    paymentBank: '',
    paymentBankRef: '',
    paymentDate: '',
    paymentStatus: 'Pending',
    notes: '', // Add miscNotes to paymentForm
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editFields, setEditFields] = useState({
    paymentBank: '',
    paymentBankRef: '',
    paymentReceived: '',
    paymentDate: '',
    notes: '',
    activeTab: 'payment' as 'payment' | 'misc',
  });
  const [exporting, setExporting] = useState(false);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [monthlySales, setMonthlySales] = useState<{ month: string; total: number }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/invoices");
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Invalid API response:", text);
          throw new Error("Server did not return valid JSON");
        }
        const data = await response.json();
        setInvoices(data);
        setOriginalInvoices(data);
        // Extract unique months from invoice dates
        const uniqueMonths: string[] = Array.from(new Set(data.map((inv) => format(new Date(inv.date), 'yyyy-MM'))));
        uniqueMonths.sort((a, b) => b.localeCompare(a)); // Descending order, latest first
        setMonths(uniqueMonths);
        setSelectedMonth((prev: string): string => (!prev || !uniqueMonths.includes(prev)) ? (uniqueMonths[0] || '') : prev);
        // Extract years from invoice dates
        const uniqueYears = Array.from(new Set(data.map((inv: any) => String(inv.date?.slice(0, 4))))).filter(Boolean) as string[];
        uniqueYears.sort((a, b) => a.localeCompare(b));
        setYears(uniqueYears);
        setSelectedYear(uniqueYears[0] || "");
      } catch (error) {
        console.error("Invoice fetch failed:", error);
        toast({
          title: "Error",
          description: "Failed to load invoices.",
        });
      }
    };
    fetchInvoices();
    // eslint-disable-next-line
  }, [toast]);

  // Fetch GST collected for selected month
  useEffect(() => {
    if (!selectedMonth) return;
    const fetchGst = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/gst-collected?month=${selectedMonth}`);
        if (!response.ok) throw new Error('Failed to fetch GST');
        const data = await response.json();
        setGstDetails({
          veshadCgst: data.veshadCgst ?? 0,
          veshadSgst: data.veshadSgst ?? 0,
          veshadIgst: data.veshadIgst ?? 0,
        });
      } catch (err) {
        setGstDetails(null);
      }
    };
    fetchGst();
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedYear || invoices.length === 0) return;
    // Calculate monthly sales for the selected year (April to March)
    const salesByMonth: { [month: string]: number } = {};
    let months: string[] = [];
    if (selectedYear) {
      // For FY: April (selectedYear) to March (selectedYear+1)
      const nextYear = (parseInt(selectedYear) + 1).toString();
      months = [
        ...Array.from({ length: 9 }, (_, i) => (i + 4).toString().padStart(2, "0")), // Apr-Dec
        ...Array.from({ length: 3 }, (_, i) => (i + 1).toString().padStart(2, "0")), // Jan-Mar
      ];
      invoices.forEach(inv => {
        if (inv.date /* && inv.status !== "Cancelled" */) {
          const year = inv.date.slice(0, 4);
          const month = inv.date.slice(5, 7);
          // April-Dec of selectedYear
          if (year === selectedYear && parseInt(month) >= 4) {
            salesByMonth[month] = (salesByMonth[month] || 0) + (inv.grandTotal || 0);
          }
          // Jan-Mar of nextYear
          if (year === nextYear && parseInt(month) <= 3) {
            salesByMonth[month] = (salesByMonth[month] || 0) + (inv.grandTotal || 0);
          }
        }
      });
    }
    setMonthlySales(months.map(m => ({ month: m, total: salesByMonth[m] || 0 })));
  }, [selectedYear, invoices]);

  const handleDeleteLocal = (invoiceNumber: string) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(invoiceNumber)}`, {
        method: "DELETE",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Delete failed");
          return fetch("http://localhost:4000/api/invoices").then((res) => res.json());
        })
        .then(setInvoices)
        .catch((err) => {
          console.error(err);
          toast({
            title: "Error",
            description: "Failed to delete invoice.",
          });
        });
      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoiceNumber} has been deleted successfully.`,
      });
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setEditPaymentInvoice(invoice);
    setPaymentForm({
      paymentReceived: invoice.paymentReceived ?? 0,
      paymentBank: invoice.paymentBank ?? '',
      paymentBankRef: invoice.paymentBankRef ?? '',
      paymentDate: invoice.paymentDate ?? '',
      paymentStatus: invoice.paymentStatus ?? 'Pending',
      notes: invoice.notes ?? '', // Initialize miscNotes
    });
  };

  const closePaymentModal = () => setEditPaymentInvoice(null);

  const handlePaymentFormChange = (field: string, value: string | number) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const savePaymentInfo = async () => {
    if (!editPaymentInvoice) return;
    const updated = {
      ...editPaymentInvoice,
      paymentReceived: Number(paymentForm.paymentReceived),
      paymentBank: paymentForm.paymentBank,
      paymentBankRef: paymentForm.paymentBankRef,
      paymentDate: paymentForm.paymentDate,
      paymentStatus: paymentForm.paymentStatus,
      notes: paymentForm.notes,
      balanceDue: (editPaymentInvoice.grandTotal ?? 0) - Number(paymentForm.paymentReceived),
    };
    try {
      const res = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(editPaymentInvoice.invoiceNumber)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed to update payment info");
      // Refresh invoices
      const refreshed = await fetch("http://localhost:4000/api/invoices").then(r => r.json());
      setInvoices(refreshed);
      setOriginalInvoices(refreshed);
      toast({ title: "Success", description: "Payment info updated." });
      closePaymentModal();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update payment info." });
    }
  };

  // Open modal and set fields
  const handleOpenEditModal = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setEditFields({
      paymentBank: invoice.paymentBank || '',
      paymentBankRef: invoice.paymentBankRef || '',
      paymentReceived: invoice.paymentReceived?.toString() || '',
      paymentDate: invoice.paymentDate ? format(new Date(invoice.paymentDate), 'yyyy-MM-dd') : '',
      notes: typeof invoice.notes === 'string' ? invoice.notes : '', 
      activeTab: 'payment', // Default to Payment Info tab
    });
    setEditModalOpen(true);
  };

  // Handle field changes
  const handleEditFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFields(prev => ({ ...prev, [name]: value }));
    if (name === 'notes') {
      setEditInvoice(prev => prev ? { ...prev, notes: value } : prev);
    }
  };

  // Save payment info
  const handleSavePaymentInfo = async () => {
    if (!editInvoice) return;
    try {
      // Fetch latest invoice from backend to get up-to-date items and all fields
      const latestRes = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(editInvoice.invoiceNumber)}`);
      if (!latestRes.ok) throw new Error('Failed to fetch latest invoice');
      const latestInvoice = await latestRes.json();
      const updated = {
        ...latestInvoice,
        paymentBank: editFields.paymentBank,
        paymentBankRef: editFields.paymentBankRef,
        paymentReceived: Number(editFields.paymentReceived) || 0,
        paymentDate: editFields.paymentDate || null,
        notes: editFields.notes !== undefined ? editFields.notes : latestInvoice.notes || '', 
      };
      const res = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(editInvoice.invoiceNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update payment info');
      // Update frontend state
      setInvoices((prev) => prev.map(inv => inv.invoiceNumber === updated.invoiceNumber ? { ...inv, ...updated } : inv));
      setEditInvoice(prev => prev ? { ...prev, ...updated } : prev);
      setEditFields(prev => ({ ...prev, miscNotes: updated.miscNotes }));
      setEditModalOpen(false);
      toast({ title: 'Payment Info Updated', description: `Invoice ${updated.invoiceNumber} payment info updated.` });
      // Force EditInvoice to refetch by navigating to edit page with a unique param
      navigate(`/invoices/edit/${encodeURIComponent(updated.invoiceNumber)}?refresh=${Date.now()}`);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update payment info.' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-3xl font-bold text-gray-900">All Invoices</h1>
        </div>
        <div className="flex flex-col gap-2">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded h-12 w-56"></div>}>
            <InvoiceStatusTab />
          </Suspense>
          <div className="text-right">
            <div className="text-xl font-semibold text-blue-800">
              Total Invoiced: ₹{invoices.reduce((sum, inv) => sum + ((inv.grandTotal ?? 0) || 0), 0).toLocaleString('en-IN')}
            </div>
            <div className="text-sm font-medium text-green-800">
              Total Received: ₹{invoices.reduce((sum, inv) => sum + ((inv.paymentReceived ?? 0) || 0), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <Link to="/invoices/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Month dropdown and GST collected display */}
      <div className="flex items-center gap-4 mb-4">
        <label htmlFor="month-select" className="font-medium">Select Month:</label>
        <select
          id="month-select"
          className="border rounded px-2 py-1"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {months.map(month => {
            let label = month;
            try {
              label = format(new Date(month + '-01'), 'MMMM yyyy');
            } catch {}
            return (
              <option key={month} value={month}>
                {label}
              </option>
            );
          })}
        </select>
        <div className="ml-6 text-lg font-semibold text-purple-800 flex gap-6">
          <span>CGST: {gstDetails ? `₹${gstDetails.veshadCgst.toLocaleString('en-IN')}` : '—'}</span>
          <span>SGST: {gstDetails ? `₹${gstDetails.veshadSgst.toLocaleString('en-IN')}` : '—'}</span>
          <span>IGST: {gstDetails ? `₹${gstDetails.veshadIgst.toLocaleString('en-IN')}` : '—'}</span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first invoice</p>
            <Link to="/invoices/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {invoices.map((invoice) => (
            <Card key={invoice.invoiceNumber} className="hover:shadow-lg transition-shadow relative p-2">
              {/* Watermark overlay for fully paid invoices */}
              {(invoice.grandTotal - (invoice.paymentReceived ?? 0)) === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-20deg)',
                    pointerEvents: 'none',
                    opacity: 0.13,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#dc2626', // red-600
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 4px #fff',
                    maxWidth: '90%',
                    textAlign: 'center',
                  }}
                >
                  Payment Recvd
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                {/* Row 1: Invoice number, client, tax, date, value, actions */}
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <span className="text-base font-bold text-blue-900 truncate min-w-0 flex-shrink-0">{invoice.invoiceNumber}</span>
                  <span className="text-gray-700 font-medium truncate min-w-0 flex-grow">{invoice.deliveryAddress_name}</span>
                  {invoice.deliveryAddress_state?.trim().toLowerCase() === "karnataka" ? (
                    <>
                      <span className="text-xs text-purple-800 bg-purple-50 rounded px-1 py-0.5">CGST: ₹{invoice.veshadCgst?.toLocaleString('en-IN') ?? '-'}</span>
                      <span className="text-xs text-purple-800 bg-purple-50 rounded px-1 py-0.5 ml-1">SGST: ₹{invoice.veshadSgst?.toLocaleString('en-IN') ?? '-'}</span>
                    </>
                  ) : (
                    <span className="text-xs text-purple-800 bg-purple-50 rounded px-1 py-0.5">IGST: ₹{invoice.veshadIgst?.toLocaleString('en-IN') ?? '-'}</span>
                  )}
                  <span className="flex items-center text-xs text-gray-500 ml-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-base font-bold text-blue-900 ml-2">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex gap-1">
                  <Link to={`/invoices/view/${encodeURIComponent(invoice.invoiceNumber)}`}><Button variant="outline" size="sm">View</Button></Link>
                  <Link to={`/invoices/edit/${encodeURIComponent(invoice.invoiceNumber)}`}><Button variant="outline" size="sm">Edit</Button></Link>
                  {invoice.paymentStatus !== 'Paid' && (
                    <Button variant="outline" size="sm" onClick={() => handleDeleteLocal(invoice.invoiceNumber)} className="text-red-600 hover:text-red-700 hover:bg-red-50">Delete</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(invoice)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">Edit Payment Info</Button>
                </div>
              </div>
              {/* Row 2: Payment info block, compact */}
              <div className="flex flex-wrap items-center justify-between gap-2 w-full mt-1 bg-blue-50 rounded border border-blue-100 p-1">
                <span className="text-xs text-gray-500">Bank: <span className="font-medium text-gray-700">{invoice.paymentBank || '-'}</span></span>
                <span className="text-xs text-gray-500">Ref ID: <span className="font-medium text-gray-700">{invoice.paymentBankRef || '-'}</span></span>
                <span className="text-xs text-gray-500">Status: {(invoice.grandTotal - (invoice.paymentReceived ?? 0)) !== 0 ? (<span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700">Pending</span>) : (<span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700">Paid Fully</span>)}</span>
                <span className="text-xs text-gray-500">Received: <span className="font-medium text-gray-700">₹{(invoice.paymentReceived ?? 0).toLocaleString('en-IN')}</span></span>
                <span className="text-xs text-gray-500">Due: <span className="font-medium text-gray-700">₹{((invoice.grandTotal ?? 0) - (invoice.paymentReceived ?? 0)).toLocaleString('en-IN')}</span></span>
                <span className="text-xs text-gray-500">Payment Recvd Date: <span className="font-medium text-gray-700">{invoice.paymentDate ? format(new Date(invoice.paymentDate), 'dd-MMM-yyyy') : '-'}</span></span>
                {invoice.notes && (
                  <span className="text-xs text-blue-700 font-semibold">Misc Notes: <span className="font-normal text-gray-700">{invoice.notes}</span></span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Info Modal */}
      <Dialog open={!!editPaymentInvoice} onOpenChange={closePaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Information</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium">Payment Received (₹)</label>
            <Input type="number" min={0} value={paymentForm.paymentReceived} onChange={e => handlePaymentFormChange('paymentReceived', e.target.value)} />
            <label className="text-xs font-medium">Payment Bank</label>
            <Input value={paymentForm.paymentBank} onChange={e => handlePaymentFormChange('paymentBank', e.target.value)} />
            <label className="text-xs font-medium">Payment Bank Ref ID</label>
            <Input value={paymentForm.paymentBankRef} onChange={e => handlePaymentFormChange('paymentBankRef', e.target.value)} />
            <label className="text-xs font-medium">Payment Recvd Date</label>
            <Input type="date" value={paymentForm.paymentDate} onChange={e => handlePaymentFormChange('paymentDate', e.target.value)} />
            <label className="text-xs font-medium">Status</label>
            <select className="border rounded px-2 py-1" value={paymentForm.paymentStatus} onChange={e => handlePaymentFormChange('paymentStatus', e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
            <label className="text-xs font-medium">Misc Notes</label>
            <textarea
              className="border rounded w-full p-2 min-h-[60px] text-sm"
              value={typeof paymentForm.notes === 'string' ? paymentForm.notes : (paymentForm.notes !== undefined && paymentForm.notes !== null ? String(paymentForm.notes) : '')}
              name="notes"
              placeholder="Enter any miscellaneous notes here..."
              onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentModal}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={savePaymentInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Info Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Information</DialogTitle>
          </DialogHeader>
          {/* Remove the old Notes field and add Misc Notes tab */}
          <div className="mt-4">
            {/* Tabs for Payment Info */}
            <div className="flex border-b border-gray-200 mb-2">
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm border-b-2 ${editFields.activeTab === 'payment' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}
                onClick={() => setEditFields(prev => ({ ...prev, activeTab: 'payment' }))}
              >
                Payment Info
              </button>
              <button
                type="button"
                className={`px-4 py-2 font-medium text-sm border-b-2 ${editFields.activeTab === 'misc' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}
                onClick={() => setEditFields(prev => ({ ...prev, activeTab: 'misc' }))}
              >
                Misc Notes
              </button>
            </div>
            {editFields.activeTab === 'payment' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="paymentBank">Bank</Label>
                  <Input id="paymentBank" name="paymentBank" value={editFields.paymentBank} onChange={handleEditFieldChange} />
                </div>
                <div>
                  <Label htmlFor="paymentBankRef">Ref ID</Label>
                  <Input id="paymentBankRef" name="paymentBankRef" value={editFields.paymentBankRef} onChange={handleEditFieldChange} />
                </div>
                <div>
                  <Label htmlFor="paymentReceived">Amount Received</Label>
                  <Input id="paymentReceived" name="paymentReceived" type="number" value={editFields.paymentReceived} onChange={handleEditFieldChange} />
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Received Date</Label>
                  <Input id="paymentDate" name="paymentDate" type="date" value={editFields.paymentDate} onChange={handleEditFieldChange} />
                </div>
              </div>
            )}
            {editFields.activeTab === 'misc' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="miscNotes">Misc Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="border rounded w-full p-2 min-h-[80px] text-sm"
                    value={editFields.notes || ''}
                    onChange={handleEditFieldChange}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSavePaymentInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Total Invoice Values by Month Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Total Invoice Values by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="year-select" className="font-medium">Select Year:</label>
            <select
              id="year-select"
              className="border rounded px-2 py-1"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div style={{ width: "50%", height: 200, minWidth: 300 }} className="mx-auto">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tickFormatter={m => {
                  const monthNum = parseInt(m);
                  let year = selectedYear;
                  if (monthNum <= 3) year = (parseInt(selectedYear) + 1).toString();
                  return new Date(`${year}-${m}-01`).toLocaleString('default', { month: 'short' });
                }} />
                <YAxis tickFormatter={v => {
                  if (v >= 10000000) return (v / 10000000).toFixed(1) + 'Cr';
                  if (v >= 100000) return (v / 100000).toFixed(1) + 'L';
                  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
                  return `₹${v}`;
                }} />
                <Tooltip formatter={v => {
                  if (typeof v !== 'number') return v;
                  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
                  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
                  if (v >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
                  return `₹${v}`;
                }} labelFormatter={m => {
                  const monthNum = parseInt(m);
                  let year = selectedYear;
                  if (monthNum <= 3) year = (parseInt(selectedYear) + 1).toString();
                  return new Date(`${year}-${m}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
                }} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" name="Total Invoice Value" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceList;
