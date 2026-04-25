import { useState, useEffect } from "react";
import PUROrderPreview from "../pages/PUROrderPreview"; 
import { useNavigate } from "react-router-dom";

const initialPUROrder = {
  purchaseNumber: "",
  date: "",
  revision: "",
  supplierName: "",
  supplierAddress: "",
  supplierCity: "",
  supplierPostalCode: "",
  supplierState: "",
  supplierContact: "",
  deliveryAddress_name: "",
  deliveryAddress_address: "",
  deliveryAddress_city: "",
  deliveryAddress_postalCode: "",
  deliveryAddress_state: "",
  deliveryDate: "",
  deliveryChallanRef: "",
  paymentTerms: "",
  GSTNo: "",
  PIC: "",
  grandTotal: "",
  isEditing: false,
  items: [
    { id: 0, item_description: "", quantity: "", unitPrice: "", total: "" }
  ],
};

// Utility to get next purchase order number
async function getNextPUROrderNumber() {
  try {
    const response = await fetch("/api/purchase-orders");
    if (!response.ok) throw new Error("Failed to fetch purchase orders");
    const orders = await response.json();
    let maxNum = 0;
    let challanYear = "";
    orders.forEach(order => {
      if (order.purchaseNumber) {
        // Extract the number part from "PUR/0001/25-26"
        const match = order.purchaseNumber.match(/^PUR\/(\d{4})\/(\d{2}-\d{2})$/);
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
    return `PUR/${nextNum}/${challanYear}`;
  } catch (err) {
    // fallback to PUR/0001/currentYear
    const now = new Date();
    const year = now.getFullYear();
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    const challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    return `PUR/0001/${challanYear}`;
  }
}

async function fetchAllPUROrders() {
  try {
    const response = await fetch("http://localhost:4000/api/purchase-orders");
    if (!response.ok) {
      throw new Error('Failed to fetch delivery challans');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching delivery challans:', error);
    throw error;
  }
}

async function deletePUROrder(purchaseNumber) {
  try {
    const response = await fetch(`http://localhost:4000/api/purchase-orders/${encodeURIComponent(purchaseNumber)}`, {
      method: 'DELETE',
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete delivery challan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting delivery challan:', error);
    throw error;
  }
}

async function getPUROrderByNumber(purchaseNumber) {
  try {
    const response = await fetch(`http://localhost:4000/api/purchase-orders/${encodeURIComponent(purchaseNumber)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch delivery challan');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching delivery challan:', error);
    throw error;
  }
}

export default function PurchasesOrder() {
  const navigate = useNavigate();
  const [dcs, setDCs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [challan, setChallan] = useState(initialPUROrder);
  const [showPreview, setShowPreview] = useState(false); 

  useEffect(() => {
    fetchAllPUROrders().then(setDCs);
  }, []);

  const handleEdit = async (purchaseNumber) => {
    try {
      const dcData = await getPUROrderByNumber(purchaseNumber);
      // Fetch items from delivery_items table for this challanNo
      let items = [];
      try {
        const itemsRes = await fetch(`http://localhost:4000/api/purchase-order-items/${encodeURIComponent(purchaseNumber)}`);
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
      console.error('Error loading purchase order for edit:', error);
      alert('Failed to load purchase order for editing. Please try again.');
    }
  };

  const handleDelete = async (challanNo) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order ${challanNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deletePUROrder(challanNo);
      const updatedDCs = await fetchAllPUROrders();
      setDCs(updatedDCs);
      alert('Purchase Order deleted successfully!');
    } catch (error) {
      console.error('Error deleting Purchase Order:', error);
      alert(error.message || 'Failed to delete Purchase Order. Please try again.');
    }
  };

  if (showPreview) {
    return (
      <div>
        {showPreview && (
          <PUROrderPreview
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
      if (!a.purchaseNumber) return 1;
      if (!b.purchaseNumber) return -1;
      return String(a.purchaseNumber).localeCompare(String(b.purchaseNumber));
    });
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Purchase Order</h2>
          <button
            onClick={async () => {
              const nextChallanNo = await getNextPUROrderNumber();
              const today = new Date().toISOString().split("T")[0];
              setChallan({ ...initialPUROrder, purchaseNumber: nextChallanNo, deliveryDate: today, isEditing: false });
              setShowPreview(true);
            }}
            style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}
          >
            Create New Purchase Order
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} border={1}>
          <thead>
            <tr style={{ background: '#4472C4', color: 'white', fontSize: 18 }}>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>P O No</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Name</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Delivery Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>GSTNo</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>PIC</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Grand Total</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDCs.map(dc => (
              <tr key={dc.challanNo} style={{ background: '#fff', fontSize: 14 }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.purchaseNumber}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.date}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.deliveryAddress_name}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.deliveryDate}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.GSTNo}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.PIC}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.grandTotal}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(dc.purchaseNumber)}
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
                      onClick={() => handleDelete(dc.purchaseNumber)}
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
