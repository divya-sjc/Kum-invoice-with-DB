import { useState, useEffect } from "react";
import PerformaInvoicePreview from "./PerformaInvoicePreview"; 
import { useNavigate } from "react-router-dom";

const initialPerformaInvoice = {
  performaInvoiceNumber: "",
  date: "",
  revision: 1,
  supplierName: "",
  supplierAddress: "",
  supplierCity: "",
  supplierPostalCode: "",
  supplierState: "",
  supplierPhone: "",
  supplierEmail: "",
  deliveryAddress_name: "",
  deliveryAddress_address: "",
  deliveryAddress_city: "",
  deliveryAddress_postalCode: "",
  deliveryAddress_state: "",
  deliveryPhone: "",
  deliveryDate: "",
  paymentTerms: "",
  requestedBy: "",
  PORef: "",
  paypalCharges: 0,
  grandTotal: 0,
  isEditing: false,
  items: [
    { id: 0, item_description: "", quantity: "", unitPrice: "", total: "" }
  ],
};

// Utility to get next purchase order number
async function getNextPerformaInvoiceNumber() {
  try {
    const response = await fetch("/api/performa-invoices");
    if (!response.ok) throw new Error("Failed to fetch performa invoices");
    const orders = await response.json();
    let maxNum = 0;
    let challanYear = "";
    orders.forEach(order => {
      if (order.performaInvoiceNumber) {
        // Extract the number part from "PUR/0001/25-26"
        const match = order.performaInvoiceNumber.match(/^PI\/(\d{4})\/(\d{2}-\d{2})$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
            challanYear = match[2];
          }
        }
      }
    });
    // If no orders exist, start from 1 and use current year
    if (!challanYear) {
      const now = new Date();
      const year = now.getFullYear();
      const startYear = year % 100;
      const endYear = (year + 1) % 100;
      challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    }
    const nextNum = (maxNum + 1).toString().padStart(4, "0");
    return `PI/${nextNum}/${challanYear}`;
  } catch (err) {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    const challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    return `PI/0001/${challanYear}`;
  }
}

async function fetchAllPerformaInvoices() {
  try {
    const response = await fetch("http://localhost:4000/api/performa-invoices");
    if (!response.ok) {
      throw new Error('Failed to fetch performa invoices');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching performa invoices:', error);
    throw error;
  }
}

async function deletePerformaInvoice(performaInvoiceNumber) {
  try {
  const response = await fetch(`http://localhost:4000/api/performa-invoices/${encodeURIComponent(performaInvoiceNumber)}`, {
      method: 'DELETE',
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete performa invoice');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting performa invoice:', error);
    throw error;
  }
}

async function getPerformaInvoiceByNumber(performaInvoiceNumber) {
  try {
  const response = await fetch(`http://localhost:4000/api/performa-invoices/${encodeURIComponent(performaInvoiceNumber)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch performa invoices');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching performa invoice:', error);
    throw error;
  }
}

export default function PerformaInvoice() {
  const navigate = useNavigate();
  const [dcs, setDCs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [challan, setChallan] = useState(initialPerformaInvoice);
  const [showPreview, setShowPreview] = useState(false); 

  useEffect(() => {
    fetchAllPerformaInvoices().then(setDCs);
  }, []);

  const handleEdit = async (performaInvoiceNumber) => {
    try {
  const dcData = await getPerformaInvoiceByNumber(performaInvoiceNumber);
      // Fetch items from delivery_items table for this challanNo
      let items = [];
      try {
  const itemsRes = await fetch(`http://localhost:4000/api/performa-invoices/${encodeURIComponent(performaInvoiceNumber)}/items`);
        if (itemsRes.ok) {
          items = await itemsRes.json();
        } else {
          items = dcData.items || [];
        }
      } catch {
        items = dcData.items || [];
      }
      setChallan({
        ...dcData,
        isEditing: true,
        items: items
      });
      setShowPreview(true); 
    } catch (error) {
      console.error('Error loading performa invoice for edit:', error);
      alert('Failed to load performa invoice for editing. Please try again.');
    }
  };

  const handleDelete = async (performaInvoiceNumber) => {
  if (!window.confirm(`Are you sure you want to delete Performa Invoice ${performaInvoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
  await deletePerformaInvoice(performaInvoiceNumber);
      const updatedDCs = await fetchAllPerformaInvoices();
      setDCs(updatedDCs);
      alert('Performa Invoice deleted successfully!');
    } catch (error) {
      console.error('Error deleting Performa Invoice:', error);
      alert(error.message || 'Failed to delete performa invoice. Please try again.');
    }
  };

  if (showPreview) {
    return (
      <div>
        {showPreview && (
          <PerformaInvoicePreview
            challan={challan}
            onChange={setChallan}
            editable={true}
            onBack={() => setShowPreview(false)}
          />
        )}
      </div>
    );
  }

  if (!showForm) {
    const sortedDCs = [...dcs].sort((a, b) => {
      if (!a.performaInvoiceNumber) return 1;
      if (!b.performaInvoiceNumber) return -1;
      return String(a.performaInvoiceNumber).localeCompare(String(b.performaInvoiceNumber));
    });
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Performa Invoice</h2>
          <button
            onClick={async () => {
              const nextPerformaInvoiceNumber = await getNextPerformaInvoiceNumber();
              const today = new Date().toISOString().split("T")[0];
              setChallan({ ...initialPerformaInvoice, performaInvoiceNumber: nextPerformaInvoiceNumber, deliveryDate: today, isEditing: false });
              setShowPreview(true);
            }}
            style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}
          >
            Create New Performa Invoice
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} border={1}>
          <thead>
            <tr style={{ background: '#4472C4', color: 'white', fontSize: 18 }}>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Performa No</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Supplier Name</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Delivery Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Delivery Name</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Requested By</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Grand Total</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDCs.map(dc => (
              <tr key={dc.challanNo} style={{ background: '#fff', fontSize: 14 }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.performaInvoiceNumber}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.date}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.supplierName}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.deliveryDate}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.deliveryAddress_name}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.requestedBy}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.grandTotal}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(dc.performaInvoiceNumber)}
                      style={{ 
                        fontSize: 12, 
                        background: '#3182ce', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4, 
                        padding: '6px 12px', 
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                      title="Edit this Purchase Order"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dc.performaInvoiceNumber)}
                      style={{ 
                        fontSize: 12, 
                        background: '#e53e3e', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4, 
                        padding: '6px 12px', 
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                      title="Delete this Purchase Order"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}
