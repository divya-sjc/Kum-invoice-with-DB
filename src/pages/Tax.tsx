import { useMemo, useEffect, useState } from "react";

// Types for both tables
interface VendorInvoice {
  date: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
}
interface Invoice {
  date: string;
  veshadCgst?: number;
  veshadSgst?: number;
  veshadIgst?: number;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function TaxSummary() {
  const [vendorsInvoices, setVendorsInvoices] = useState<VendorInvoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:4000/api/vendors-invoices")
      .then((res) => res.json())
      .then(setVendorsInvoices)
      .catch(() => setVendorsInvoices([]));
    fetch("http://localhost:4000/api/invoices")
      .then((res) => res.json())
      .then(setInvoices)
      .catch(() => setInvoices([]));
  }, []);

  // Merge by year-month
  const taxByMonth = useMemo(() => {
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
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
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
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
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
    return acc;
  }, [vendorsInvoices, invoices]);

  // Get all years present in the data
  const years = useMemo(() => {
    const set = new Set<string>();
    [...vendorsInvoices, ...invoices].forEach((inv: any) => {
      if (!inv.date) return;
      const dateObj = new Date(inv.date);
      if (isNaN(dateObj.getTime())) return;
      const year = dateObj.getFullYear().toString();
      set.add(year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a)); // Descending
  }, [vendorsInvoices, invoices]);

  // Set default year to latest
  useEffect(() => {
    if (years.length && !selectedYear) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const sortedKeys = Object.keys(taxByMonth)
    .filter((key) => {
      if (!selectedYear) return true;
      return taxByMonth[key].year.toString() === selectedYear;
    })
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Tax Summary by Month
        </h1>
        <div>
          <label
            htmlFor="year-select"
            className="mr-2 font-medium"
          >
            Year:
          </label>
          <select
            id="year-select"
            className="border rounded px-2 py-1"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Month</th>
              <th className="border px-4 py-2">CGST Collected</th>
              <th className="border px-4 py-2">SGST Collected</th>
              <th className="border px-4 py-2">IGST Collected</th>
              <th className="border px-4 py-2">Veshad CGST</th>
              <th className="border px-4 py-2">Veshad SGST</th>
              <th className="border px-4 py-2">Veshad IGST</th>
              <th className="border px-4 py-2">Recedual</th>
            </tr>
          </thead>
          <tbody>
            {sortedKeys.map((key) => {
              const { cgst, sgst, igst, veshadCgst, veshadSgst, veshadIgst, month, year } = taxByMonth[key];
              const totalGST = (cgst || 0) + (sgst || 0) + (igst || 0);
              const totalVeshadGST = (veshadCgst || 0) + (veshadSgst || 0) + (veshadIgst || 0);
              const recedual =  totalVeshadGST - totalGST;
              return (
                <tr key={key}>
                  <td className="border px-4 py-2 font-medium">
                    {monthNames[month]} {year}
                  </td>
                  <td className="border px-4 py-2 text-green-800">
                    ₹{cgst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-green-800">
                    ₹{sgst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-green-800">
                    ₹{igst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-blue-800">
                    ₹{veshadCgst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-blue-800">
                    ₹{veshadSgst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-blue-800">
                    ₹{veshadIgst.toLocaleString("en-IN")}
                  </td>
                  <td className="border px-4 py-2 text-red-800 font-bold">
                    ₹{recedual.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
