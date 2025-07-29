import React, { useEffect, useState } from "react";

export default function PendingInvoices() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPending = async () => {
    setRefreshing(true);
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setPending(data.filter(inv => inv.paymentStatus === 'Pending'));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Pending Payment Status Invoices</h2>
        <button onClick={fetchPending} disabled={refreshing} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Invoice Number</th>
            <th>Date</th>
            <th>Buyer</th>
            <th>Grand Total</th>
            <th>Balance Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pending.map(inv => (
            <tr key={inv.invoiceNumber}>
              <td>{inv.invoiceNumber}</td>
              <td>{inv.date}</td>
              <td>{inv.deliveryAddress_name}</td>
              <td>{inv.grandTotal}</td>
              <td>{inv.balanceDue}</td>
              <td>{inv.paymentStatus}</td>
            </tr>
          ))}
          {pending.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No pending invoices</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
