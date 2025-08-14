import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard: React.FC = () => {
  // Bank Balances Tab State
  const [bankBalances, setBankBalances] = useState<{ bank: string; credit: number; debit: number; balance: number }[]>([]);
  const [bankBalancesLoading, setBankBalancesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  // Fetch and aggregate purchases for Bank Balances
  const fetchBankBalances = async () => {
    setBankBalancesLoading(true);
    try {
      const res = await fetch("/api/purchases");
      const json = await res.json();
      const purchases = Array.isArray(json) ? json : (json.data || []);
      // Aggregate by refBankName: sum credit and debit, then compute balance
      const bankMap: Record<string, { credit: number; debit: number }> = {};
      purchases.forEach((p: any) => {
        const bank = p.refBankName || "(No Bank)";
        if (!bankMap[bank]) bankMap[bank] = { credit: 0, debit: 0 };
        bankMap[bank].credit += Number(p.credit) || 0;
        bankMap[bank].debit += Number(p.debit) || 0;
      });
      const summary = Object.entries(bankMap).map(([bank, { credit, debit }]) => ({
        bank,
        credit,
        debit,
        balance: credit - debit
      }));
      setBankBalances(summary);
      localStorage.setItem("bankBalancesSummary", JSON.stringify(summary));
    } catch {
      // fallback to localStorage
      const local = localStorage.getItem("bankBalancesSummary");
      if (local) setBankBalances(JSON.parse(local));
    } finally {
      setBankBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bank") fetchBankBalances();
  }, [activeTab]);
  const [pending, setPending] = useState<any[]>([]);
  const [gstMonth, setGstMonth] = useState<{veshadCgst:number,veshadSgst:number,veshadIgst:number}|null>(null);
  const [gstFY, setGstFY] = useState<{veshadCgst:number,veshadSgst:number,veshadIgst:number}|null>(null);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [fy, setFy] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // New: Vendor GST ITC states
  const [vendorGstMonth, setVendorGstMonth] = useState<{cgst:number,sgst:number,igst:number}|null>(null);
  const [vendorGstFY, setVendorGstFY] = useState<{cgst:number,sgst:number,igst:number}|null>(null);
  const [vendorMonths, setVendorMonths] = useState<string[]>([]);
  const [selectedVendorMonth, setSelectedVendorMonth] = useState<string>("");

  // Get current month in yyyy-MM
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Get current FY (April-March)
  useEffect(() => {
    let fyStart = now.getFullYear();
    let fyEnd = now.getFullYear() + 1;
    if (now.getMonth() + 1 < 4) {
      fyStart = now.getFullYear() - 1;
      fyEnd = now.getFullYear();
    }
    setFy(`${fyStart}-${fyEnd}`);
  }, []);

  // Fetch pending invoices (always up-to-date)
  const fetchPending = () => {
    fetch("/api/invoices")
      .then(r => r.json())
      .then(data => {
        // Consider invoice as paid if grandTotal - paymentReceived <= 0
        const pendingInvoices = data.filter((inv:any) => {
          const paid = (inv.grandTotal ?? 0) - (inv.paymentReceived ?? 0) <= 0;
          return !paid;
        }).map((inv:any) => ({
          ...inv,
          balanceDue: (inv.grandTotal ?? 0) - (inv.paymentReceived ?? 0)
        }));
        setPending(pendingInvoices);
      });
  };

  useEffect(() => {
    // Only run if fy is set and valid
    if (!fy || !fy.includes('-')) return;
    setLoading(true);
    fetchPending();
    // GST current month
    fetch(`/api/gst-collected?month=${currentMonth}`)
      .then(r => r.json())
      .then(setGstMonth)
      .catch(() => setGstMonth(null));
    // GST till date (FY)
    fetch(`/api/gst-collected-fy`)
      .then(r => r.json())
      .then(setGstFY)
      .catch(() => setGstFY(null));
    // Vendor GST current month
    fetch(`/api/vendor/gst-collected?month=${currentMonth}`)
      .then(r => r.json())
      .then(setVendorGstMonth)
      .catch(() => setVendorGstMonth(null));
    // Vendor GST till date (FY)
    fetch(`/api/vendor/gst-collected-fy`)
      .then(r => r.json())
      .then(setVendorGstFY)
      .catch(() => setVendorGstFY(null));
    // Total invoices and received for FY
    fetch("/api/invoices")
      .then(r => r.json())
      .then((data:any[] = []) => {
        // Filter for current FY
        let [fyStart, fyEnd] = fy.split('-').map(Number);
        if (isNaN(fyStart) || isNaN(fyEnd)) {
          setTotalInvoices(0);
          setTotalReceived(0);
          setLoading(false);
          return;
        }
        const invoicesFY = data.filter(inv => {
          if (!inv.date) return false;
          const d = new Date(inv.date);
          const y = d.getFullYear();
          const m = d.getMonth()+1;
          // FY: Apr (fyStart) to Mar (fyEnd)
          return (y === fyStart && m >= 4) || (y === fyEnd && m <= 3);
        });
        setTotalInvoices(invoicesFY.length);
        setTotalReceived(invoicesFY.reduce((sum, inv) => sum + (inv.paymentReceived ?? 0), 0));
        setLoading(false);
      })
      .catch(() => {
        setTotalInvoices(0);
        setTotalReceived(0);
        setLoading(false);
      });
    // Auto-refresh pending invoices every 30s
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fy, currentMonth]);

  // Fetch available months for vendor invoices
  useEffect(() => {
    fetch("/api/vendors-invoices")
      .then(r => r.json())
      .then((data:any[]) => {
        const months = Array.from(new Set((data || []).map((inv:any) => inv.date?.slice(0,7)))).filter(Boolean).sort((a,b)=>b.localeCompare(a));
        setVendorMonths(months);
        setSelectedVendorMonth(months[0] || "");
      });
  }, []);

  // Fetch GST ITC for selected month
  useEffect(() => {
    if (!selectedVendorMonth) return;
    fetch(`/api/vendors-invoices/gst-itc?month=${selectedVendorMonth}`)
      .then(r => r.json())
      .then(setVendorGstMonth)
      .catch(() => setVendorGstMonth(null));
  }, [selectedVendorMonth]);

  // Fetch GST ITC for FY
  useEffect(() => {
    fetch(`/api/vendors-invoices/gst-itc-fy`)
      .then(r => r.json())
      .then(setVendorGstFY)
      .catch(() => setVendorGstFY(null));
  }, []);


  if (loading || !fy || !fy.includes('-')) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="main">Main</TabsTrigger>
          <TabsTrigger value="bank">Bank Balances</TabsTrigger>
        </TabsList>
        <TabsContent value="main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending Payment Status Invoices</CardTitle>
                <button
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  onClick={() => { setLoading(true); fetchPending(); setTimeout(() => setLoading(false), 500); }}
                  title="Refresh Pending Invoices"
                >
                  Refresh
                </button>
              </CardHeader>
              <CardContent>
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">Invoice No</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Buyer</th>
                      <th className="border px-2 py-1">Grand Total</th>
                      <th className="border px-2 py-1">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pending || []).map(inv => (
                      <tr key={inv.invoiceNumber}>
                        <td className="border px-2 py-1">{inv.invoiceNumber}</td>
                        <td className="border px-2 py-1">{inv.date}</td>
                        <td className="border px-2 py-1">{inv.deliveryAddress_name}</td>
                        <td className="border px-2 py-1">₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                        <td className="border px-2 py-1">₹{inv.balanceDue?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {(!pending || pending.length === 0) && <tr><td colSpan={5} className="text-center text-gray-500 py-2">No pending invoices</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {/* GST Collected Cards Side by Side */}
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <Card className="flex-1">
                  <CardHeader><CardTitle>GST Collected (Current Month)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <span>CGST: ₹{gstMonth?.veshadCgst?.toLocaleString('en-IN') ?? '—'}</span>
                      <span>SGST: ₹{gstMonth?.veshadSgst?.toLocaleString('en-IN') ?? '—'}</span>
                      <span>IGST: ₹{gstMonth?.veshadIgst?.toLocaleString('en-IN') ?? '—'}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>
                      GST Collected Till Date<br />
                      <span className="text-xs font-normal text-gray-500">(FY {fy})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <span>CGST: ₹{gstFY?.veshadCgst?.toLocaleString('en-IN') ?? '—'}</span>
                      <span>SGST: ₹{gstFY?.veshadSgst?.toLocaleString('en-IN') ?? '—'}</span>
                      <span>IGST: ₹{gstFY?.veshadIgst?.toLocaleString('en-IN') ?? '—'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* New: Vendor GST ITC Tab */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Total GST ITC (Vendor Invoices)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">For Month:</span>
                        <select value={selectedVendorMonth} onChange={e => setSelectedVendorMonth(e.target.value)} className="border rounded px-2 py-1">
                          {(vendorMonths || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span>CGST Input: ₹{vendorGstMonth?.cgst?.toLocaleString('en-IN') ?? '—'}</span>
                        <span>SGST Input: ₹{vendorGstMonth?.sgst?.toLocaleString('en-IN') ?? '—'}</span>
                        <span>IGST Input: ₹{vendorGstMonth?.igst?.toLocaleString('en-IN') ?? '—'}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-2">For Financial Year</div>
                      <div className="flex flex-col gap-1">
                        <span>CGST Input: ₹{vendorGstFY?.cgst?.toLocaleString('en-IN') ?? '—'}</span>
                        <span>SGST Input: ₹{vendorGstFY?.sgst?.toLocaleString('en-IN') ?? '—'}</span>
                        <span>IGST Input: ₹{vendorGstFY?.igst?.toLocaleString('en-IN') ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* FY Stats */}
          <Card>
            <CardHeader><CardTitle>Financial Year Stats ({fy})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <span>Total Invoices Created: <b>{totalInvoices}</b></span>
                <span>Total Amount Received: <b>₹{totalReceived.toLocaleString('en-IN')}</b></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bank">
          <Card>
            <CardHeader><CardTitle>Bank Balances</CardTitle></CardHeader>
            <CardContent>
              {bankBalancesLoading ? (
                <div>Loading bank balances...</div>
              ) : (
                <table className="border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">Bank Name</th>
                      {/* <th className="border px-2 py-1 text-right">Total Credit</th>
                      <th className="border px-2 py-1 text-right">Total Debit</th> */}
                      <th className="border px-2 py-1 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankBalances.map(row => (
                      <tr key={row.bank}>
                        <td className="px-2 py-1">{row.bank}</td>
                        {/* <td className="text-right px-2 py-1">₹{row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right px-2 py-1">₹{row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td> */}
                        <td className={`text-right font-bold px-2 py-1 ${row.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {(!bankBalances || bankBalances.length === 0) && <tr><td colSpan={4} className="text-center text-gray-500 py-2">No data</td></tr>}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;

// <Route path="/" element={<Dashboard />} />