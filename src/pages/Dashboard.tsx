import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { BarChart, Bar } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard: React.FC = () => {
  // Chart customization states
  // Persist chartType and colors in localStorage
  const [chartType, setChartType] = useState<'line' | 'bar'>(() => {
    return (localStorage.getItem('dashboardChartType') as 'line' | 'bar') || 'line';
  });
  const [invoiceColor, setInvoiceColor] = useState<string>(() => {
    return localStorage.getItem('dashboardInvoiceColor') || '#FF0000';
  });
  const [purchaseColor, setPurchaseColor] = useState<string>(() => {
    return localStorage.getItem('dashboardPurchaseColor') || '#b91c1c';
  });
  // Year selection for comparison graph
  const [comparisonYear, setComparisonYear] = useState<string>("2025");
  // Only allow 2024, 2025, 2026 in dropdown
  const availableYears = [ "2025", "2026"];
  // State for monthly purchases and invoice values
  const [monthlyComparison, setMonthlyComparison] = useState<{ month: string; invoice: number; purchase: number }[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  useEffect(() => {
    setComparisonLoading(true);
    setComparisonError(null);
    Promise.all([
      fetch("/api/invoices").then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Invoices API error: ${res.status} ${text}`);
        }
        return res.json();
      }),
      fetch("/api/purchases").then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Purchases API error: ${res.status} ${text}`);
        }
        return res.json();
      })
    ]).then(([invoices, purchases]) => {
      // Ensure purchases is always an array
      const invoicesArr = Array.isArray(invoices) ? invoices : (invoices?.data ?? []);
      const purchasesArr = Array.isArray(purchases) ? purchases : (purchases?.data ?? []);
      // No dynamic year calculation, only use 2024, 2025, 2026
      // Group by yyyy-MM, filter by selected year
      const invoiceByMonth: Record<string, number> = {};
      const purchaseByMonth: Record<string, number> = {};
      invoicesArr.forEach((inv: any) => {
        if (!inv.date) return;
        if (comparisonYear && inv.date.slice(0,4) !== comparisonYear) return;
        const key = inv.date.slice(0,7);
        invoiceByMonth[key] = (invoiceByMonth[key] || 0) + (inv.grandTotal ?? 0);
      });
      purchasesArr.forEach((p: any) => {
        if (!p.date) return;
        if (comparisonYear && p.date.slice(0,4) !== comparisonYear) return;
        const key = p.date.slice(0,7);
        const value = p.debit ?? p.credit ?? 0;
        purchaseByMonth[key] = (purchaseByMonth[key] || 0) + value;
      });
      // Always show Jan-Dec for selected year
      const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
        const monthNum = (i + 1).toString().padStart(2, '0');
        return `${comparisonYear}-${monthNum}`;
      });
      setMonthlyComparison(monthsOfYear.map(m => ({
        month: m,
        invoice: invoiceByMonth[m] || 0,
        purchase: purchaseByMonth[m] || 0
      })));
      setComparisonLoading(false);
    }).catch(err => {
      setComparisonError(`Failed to load comparison data: ${err.message}`);
      setComparisonLoading(false);
      // Also log to console for debugging
      console.error("Comparison graph error:", err);
    });
  }, [comparisonYear]);

  // Persist chartType and colors when changed
  useEffect(() => {
    localStorage.setItem('dashboardChartType', chartType);
  }, [chartType]);
  useEffect(() => {
    localStorage.setItem('dashboardInvoiceColor', invoiceColor);
  }, [invoiceColor]);
  useEffect(() => {
    localStorage.setItem('dashboardPurchaseColor', purchaseColor);
  }, [purchaseColor]);
  // Taxes Paid Summary State and Data
  // Month names for display
  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];

  // Taxes Paid Data State
  const [taxData, setTaxData] = useState<Record<string, {
    cgst: number;
    sgst: number;
    igst: number;
    veshadCgst: number;
    veshadSgst: number;
    veshadIgst: number;
    month: number;
    year: number;
  }>>({});
  const [taxMonths, setTaxMonths] = useState<string[]>([]);
  const [taxYears, setTaxYears] = useState<string[]>([]);
  const [selectedTaxMonth, setSelectedTaxMonth] = useState<string>("");
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch("/api/vendors-invoices").then(res => res.json()).catch(() => []),
      fetch("/api/invoices").then(res => res.json()).catch(() => [])
    ]).then(([vendorsInvoices, invoices]) => {
      const acc: Record<string, {
        cgst: number; sgst: number; igst: number;
        veshadCgst: number; veshadSgst: number; veshadIgst: number;
        month: number; year: number;
      }> = {};
      // Vendor GST
      for (const inv of vendorsInvoices) {
        if (!inv.date) continue;
        const dateObj = new Date(inv.date);
        if (isNaN(dateObj.getTime())) continue;
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
        if (!acc[key]) {
          acc[key] = {
            cgst: 0, sgst: 0, igst: 0,
            veshadCgst: 0, veshadSgst: 0, veshadIgst: 0,
            month: dateObj.getMonth(), year: dateObj.getFullYear()
          };
        }
        acc[key].cgst += inv.cgst || 0;
        acc[key].sgst += inv.sgst || 0;
        acc[key].igst += inv.igst || 0;
      }
      // Veshad GST
      for (const inv of invoices) {
        if (!inv.date) continue;
        const dateObj = new Date(inv.date);
        if (isNaN(dateObj.getTime())) continue;
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
        if (!acc[key]) {
          acc[key] = {
            cgst: 0, sgst: 0, igst: 0,
            veshadCgst: 0, veshadSgst: 0, veshadIgst: 0,
            month: dateObj.getMonth(), year: dateObj.getFullYear()
          };
        }
        acc[key].veshadCgst += inv.veshadCgst || 0;
        acc[key].veshadSgst += inv.veshadSgst || 0;
        acc[key].veshadIgst += inv.veshadIgst || 0;
      }
      setTaxData(acc);
      // Split months and years
  // Use month numbers 1-12 for dropdown, but store keys as yyyy-mm
  // Store month numbers as 0-based for lookup, but dropdown uses 1-based
  const allMonthNums = Array.from(new Set(Object.values(acc).map(v => v.month))).sort((a, b) => a - b);
  const allYears = Array.from(new Set(Object.values(acc).map(v => v.year))).sort((a, b) => b - a);
  setTaxMonths(allMonthNums.map(m => m.toString()));
  setTaxYears(allYears.map(y => y.toString()));
      // Set defaults to current month/year if available
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-based
      const currentYear = now.getFullYear();
      if (allMonthNums.includes(currentMonth)) {
        setSelectedTaxMonth(currentMonth.toString());
      } else if (allMonthNums.length) {
        setSelectedTaxMonth(allMonthNums[0].toString());
      }
      if (allYears.includes(currentYear)) {
        setSelectedTaxYear(currentYear.toString());
      } else if (allYears.length) {
        setSelectedTaxYear(allYears[0].toString());
      }
    });
  }, []);
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
  const [selectedFy, setSelectedFy] = useState<string>("");
  const [fyOptions, setFyOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // New: Vendor GST ITC states
  const [vendorGstMonth, setVendorGstMonth] = useState<{cgst:number,sgst:number,igst:number}|null>(null);
  const [vendorGstFY, setVendorGstFY] = useState<{cgst:number,sgst:number,igst:number}|null>(null);
  const [vendorMonths, setVendorMonths] = useState<string[]>([]);
  const [selectedVendorMonth, setSelectedVendorMonth] = useState<string>("");

  // Get current month in yyyy-MM
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Get FY options from existing invoices and vendors_invoices (April-March ranges)
  useEffect(() => {
    const toFy = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const fyStart = month < 4 ? year - 1 : year;
      return `${fyStart}-${fyStart + 1}`;
    };

    const assignFyOptions = (values: string[]) => {
      const uniq = Array.from(new Set(values.filter(Boolean)));
      const sorted = uniq.sort((a, b) => Number(b.split('-')[0]) - Number(a.split('-')[0]));
      setFyOptions(sorted);
      if (!selectedFy && sorted.length > 0) {
        setSelectedFy(sorted[0]);
      }
    };

    Promise.all([
      fetch('/api/invoices').then(r => r.json()).catch(() => []),
      fetch('/api/vendors-invoices').then(r => r.json()).catch(() => [])
    ]).then(([invoices, vendorsInvoices]: any) => {
      const invs = Array.isArray(invoices) ? invoices : invoices?.data || [];
      const ven = Array.isArray(vendorsInvoices) ? vendorsInvoices : vendorsInvoices?.data || [];
      const fyValues = [
        ...invs.map((i: any) => toFy(i?.date)).filter(Boolean),
        ...ven.map((v: any) => toFy(v?.date)).filter(Boolean)
      ] as string[];

      const nowFy = toFy(new Date());
      if (nowFy) fyValues.push(nowFy);

      assignFyOptions(fyValues);
    });
  }, [selectedFy]);

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
    // Only run if selectedFy is set and valid
    if (!selectedFy || !selectedFy.includes('-')) return;
    setLoading(true);
    fetchPending();
    // GST current month
    fetch(`/api/gst-collected?month=${currentMonth}`)
      .then(r => r.json())
      .then(setGstMonth)
      .catch(() => setGstMonth(null));
    // GST till date (FY)
    fetch(`/api/gst-collected-fy?fy=${selectedFy}`)
      .then(r => r.json())
      .then(setGstFY)
      .catch(() => setGstFY(null));
    // Vendor GST current month
    fetch(`/api/vendor/gst-collected?month=${currentMonth}`)
      .then(r => r.json())
      .then(setVendorGstMonth)
      .catch(() => setVendorGstMonth(null));
    // Vendor GST till date (FY)
    fetch(`/api/vendor/gst-collected-fy?fy=${selectedFy}`)
      .then(r => r.json())
      .then(setVendorGstFY)
      .catch(() => setVendorGstFY(null));
    // Total invoices and received for FY
    fetch("/api/invoices")
      .then(r => r.json())
      .then((data:any[] = []) => {
        // Filter for current FY
        let [fyStart, fyEnd] = selectedFy.split('-').map(Number);
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
        // Only sum paymentReceived for invoices marked as Paid
        setTotalReceived(invoicesFY.reduce((sum, inv) => {
          if (inv.paymentStatus === 'Paid') {
            return sum + (inv.paymentReceived ?? 0);
          }
          return sum;
        }, 0));
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
  }, [selectedFy, currentMonth]);

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


  if (loading || !selectedFy || !selectedFy.includes('-')) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="main">Main</TabsTrigger>
          <TabsTrigger value="bank">Bank Balances</TabsTrigger>
        </TabsList>
        <TabsContent value="main">
          {/* Row 1: 2-Column Grid - FY dropdown moves to top of right column */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* LEFT COLUMN: Pending Invoices + FY Invoice Status (stacked vertically) */}
            <div className="flex flex-col gap-4">
              {/* Pending Payment Status Invoices */}
              <Card style={{ borderBottom: '4px solid #FF9800' }}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle style={{ color: '#4472C4' }}>Pending Payment Status Invoices</CardTitle>
                  <button
                    className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    onClick={() => { setLoading(true); fetchPending(); setTimeout(() => setLoading(false), 500); }}
                    title="Refresh Pending Invoices"
                  >
                    Refresh
                  </button>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="overflow-x-auto">
                    <table className="w-full border text-xs">
                      <thead>
                        <tr style={{ backgroundColor: '#4472C4', color: '#fff' }}>
                          <th className="border px-1 py-1">Inv No</th>
                          <th className="border px-1 py-1">Date</th>
                          <th className="border px-1 py-1">Client</th>
                          <th className="border px-1 py-1 text-right">Total</th>
                          <th className="border px-1 py-1 text-right">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pending || []).slice(0, 10).map(inv => (
                          <tr key={inv.invoiceNumber}>
                            <td className="border px-1 py-1">{inv.invoiceNumber}</td>
                            <td className="border px-1 py-1">{inv.date}</td>
                            <td className="border px-1 py-1 truncate max-w-[100px]">{inv.deliveryAddress_name}</td>
                            <td className="border px-1 py-1 text-right">₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                            <td className={`border px-1 py-1 text-right${inv.balanceDue > 0 ? ' text-red-600 font-bold' : ''}`}>₹{inv.balanceDue?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        {(!pending || pending.length === 0) && <tr><td colSpan={5} className="text-center text-gray-500 py-2">No pending invoices</td></tr>}
                      </tbody>
                      {pending && pending.length > 0 && (
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="border px-1 py-1 text-right font-bold">Total:</td>
                            <td className="border px-1 py-1 text-red-700 font-bold">₹{pending.reduce((sum, inv) => sum + (inv.balanceDue ?? 0), 0).toLocaleString('en-IN')}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* FY Invoice Status */}
              <Card style={{ borderBottom: '4px solid #9C27B0' }}>
                <CardHeader><CardTitle style={{ color: '#4472C4', fontSize: '1em' }}>Financial Year Invoice Status ({selectedFy})</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <span style={{ fontSize: '0.85em' }}>Total Invoices Created: <b>{totalInvoices}</b></span>
                    <span style={{ fontSize: '0.85em' }}>Total Amount Received: <b>₹{totalReceived.toLocaleString('en-IN')}</b></span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: GST Cards + Chart (stacked vertically) */}
            <div className="flex flex-col gap-4">
              {/* FY Dropdown + GST Collected Till Date */}
              <Card style={{ borderBottom: '4px solid #4CAF50' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle style={{ color: '#4472C4' }}>GST Collected Till Date ({selectedFy})</CardTitle>
                    <select
                      id="fy-select"
                      value={selectedFy}
                      onChange={e => setSelectedFy(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                      style={{ backgroundColor: 'white', border: '1px solid #4472C4', color: '#4472C4' }}
                    >
                      {fyOptions.map(fy => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <span>CGST: ₹{gstFY?.veshadCgst?.toLocaleString('en-IN') ?? '—'}</span>
                    <span>SGST: ₹{gstFY?.veshadSgst?.toLocaleString('en-IN') ?? '—'}</span>
                    <span>IGST: ₹{gstFY?.veshadIgst?.toLocaleString('en-IN') ?? '—'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* GST ITC */}
              <Card className="flex-1" style={{ borderBottom: '4px solid #2196F3' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#4472C4' }}>Total GST ITC (Vendor Invoices)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="font-semibold mb-2">For Financial Year</div>
                      <div className="flex flex-col gap-2">
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

          {/* Purchase vs Invoice Chart - Full Width */}
          <Card className="mt-4" style={{ borderBottom: '4px solid #E91E63' }}>
            <CardHeader>
              <CardTitle style={{ color: '#4472C4' }}>Purchases vs Invoice Values (Year-Wise)</CardTitle>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <label htmlFor="comparison-year" className="font-medium text-xs">Year:</label>
                <select
                  id="comparison-year"
                  className="border rounded px-2 py-1 text-xs"
                  value={comparisonYear}
                  onChange={e => setComparisonYear(e.target.value)}
                  style={{ minWidth: 80 }}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <label htmlFor="chart-type" className="font-medium text-xs ml-4">Chart Type:</label>
                <select
                  id="chart-type"
                  className="border rounded px-2 py-1 text-xs"
                  value={chartType}
                  onChange={e => setChartType(e.target.value as 'line' | 'bar')}
                  style={{ minWidth: 80 }}
                >
                  <option value="line">Line</option>
                  <option value="bar">Bar</option>
                </select>
                <label htmlFor="invoice-color" className="font-medium text-xs ml-4">Invoice Color:</label>
                <input
                  id="invoice-color"
                  type="color"
                  value={invoiceColor}
                  onChange={e => setInvoiceColor(e.target.value)}
                  className="ml-1"
                  style={{ width: 32, height: 32, border: 'none', background: 'none' }}
                />
                <label htmlFor="purchase-color" className="font-medium text-xs ml-4">Purchase Color:</label>
                <input
                  id="purchase-color"
                  type="color"
                  value={purchaseColor}
                  onChange={e => setPurchaseColor(e.target.value)}
                  className="ml-1"
                  style={{ width: 32, height: 32, border: 'none', background: 'none' }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <div>Loading graph...</div>
              ) : comparisonError ? (
                <div className="text-red-600">{comparisonError}</div>
              ) : (
                <div style={{ width: "100%", height: 130 }}>
                  <ResponsiveContainer width="100%" height={130}>
                    {chartType === 'line' ? (
                      <LineChart data={monthlyComparison} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" tickFormatter={m => {
                          try {
                            return new Date(m + "-01").toLocaleString('default', { month: 'short', year: '2-digit' });
                          } catch {
                            return m;
                          }
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
                          try {
                            return new Date(m + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });
                          } catch {
                            return m;
                          }
                        }} />
                        <Legend />
                        <Line type="monotone" dataKey="invoice" stroke={invoiceColor} name="Invoice Value" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="purchase" stroke={purchaseColor} name="Purchase Value" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    ) : (
                      <BarChart data={monthlyComparison} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" tickFormatter={m => {
                          try {
                            return new Date(m + "-01").toLocaleString('default', { month: 'short', year: '2-digit' });
                          } catch {
                            return m;
                          }
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
                          try {
                            return new Date(m + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });
                          } catch {
                            return m;
                          }
                        }} />
                        <Legend />
                        <Bar dataKey="invoice" fill={invoiceColor} name="Invoice Value" />
                        <Bar dataKey="purchase" fill={purchaseColor} name="Purchase Value" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Taxes Paid Summary */}
          <Card className="mt-4" style={{ borderBottom: '4px solid #00BCD4' }}>
            <CardHeader>
              <CardTitle style={{ color: '#4472C4' }}>Taxes Paid Summary (Month-wise)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Select Month:</span>
                <select value={selectedTaxMonth} onChange={e => setSelectedTaxMonth(e.target.value)} className="border rounded px-2 py-1">
                  {taxMonths.map(m => <option key={m} value={m}>{monthNames[parseInt(m)]}</option>)}
                </select>
                <span className="font-semibold ml-4">Select Year:</span>
                <select value={selectedTaxYear} onChange={e => setSelectedTaxYear(e.target.value)} className="border rounded px-2 py-1">
                  {taxYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <table className="min-w-full border text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#4472C4', color: '#fff' }}>
                    <th className="border px-2 py-1">Month</th>
                    <th className="border px-2 py-1">CGST Collected</th>
                    <th className="border px-2 py-1">SGST Collected</th>
                    <th className="border px-2 py-1">IGST Collected</th>
                    <th className="border px-2 py-1">Veshad CGST</th>
                    <th className="border px-2 py-1">Veshad SGST</th>
                    <th className="border px-2 py-1">Veshad IGST</th>
                    <th className="border px-2 py-1">Residual</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Find the key for selected month and year (month is 1-based)
                    // selectedTaxMonth is 0-based string, so key is year-(month+1)
                    const key = `${selectedTaxYear}-${(parseInt(selectedTaxMonth)+1).toString().padStart(2,'0')}`;
                    const row = taxData[key];
                    if (row) {
                      // Display monthNames[row.month] where row.month is 0-based
                      return (
                        <tr>
                          <td className="border px-2 py-1 font-semibold">{monthNames[row.month]} {row.year}</td>
                          <td className="border px-2 py-1 text-green-800">₹{row.cgst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-green-800">₹{row.sgst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-green-800">₹{row.igst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-blue-800">₹{row.veshadCgst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-blue-800">₹{row.veshadSgst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-blue-800">₹{row.veshadIgst.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-1 text-red-800 font-bold">₹{(row.veshadCgst + row.veshadSgst + row.veshadIgst - row.cgst - row.sgst - row.igst).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr>
                          <td className="border px-2 py-1" colSpan={8}>No data available for this month and year.</td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card style={{ borderBottom: '4px solid #8BC34A' }}>
            <CardHeader><CardTitle>Bank Balances</CardTitle></CardHeader>
            <CardContent>
              {bankBalancesLoading ? (
                <div>Loading bank balances...</div>
              ) : (
                <table className="border text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#4472C4', color: '#fff' }}>
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
