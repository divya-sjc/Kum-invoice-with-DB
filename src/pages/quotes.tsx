import { useState, useEffect } from "react";
import QuotesPreview from "./QuotesPreview"; 
import { useNavigate } from "react-router-dom";

const initialQuotes = {
  quotesNumber: "",
  date: "",
  revision: 1,
  supplierName: "",
  supplierAddress: "",
  supplierCity: "",
  supplierPostalCode: "",
  supplierState: "",
  supplierPhone: "",
  supplierEmail: "",
  clientAddress_name: "",
  clientAddress_address: "",
  clientAddress_city: "",
  clientAddress_postalCode: "",
  clientAddress_state: "",
  clientPhone: "",
  clientEmail: "",
  clientWebsite: "",
  deliveryDate: "",
  paymentTerms: "",
  requestedBy: "",
  department: "",
  paypalCharges: 0,
  grandTotal: 0,
  isEditing: false,
  items: [
    { id: 0, item_description: "", quantity: "", unitPrice: "", total: "" }
  ],
};

// Utility to get next quotes number
async function getNextQuotesNumber() {
  try {
    const response = await fetch("http://localhost:4000/api/quotes/next-number");
    if (!response.ok) throw new Error("Failed to fetch next number");
    const data = await response.json();
    return data.quotesNumber;
  } catch (err) {
    // fallback
    const now = new Date();
    const year = now.getFullYear();
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    const fy = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    return `QTE/${fy}/0001`;
  }
}

async function fetchAllQuotes() {
  try {
    const response = await fetch("http://localhost:4000/api/quotes");
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }
}

async function deleteQuote(quoteNumber) {
  try {
    const response = await fetch(`http://localhost:4000/api/quotes/${encodeURIComponent(quoteNumber)}`, {
      method: 'DELETE',
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete quotes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting quotes:', error);
    throw error;
  }
}

async function getQuoteByNumber(quoteNumber) {
  try {
    const response = await fetch(`http://localhost:4000/api/quotes/${encodeURIComponent(quoteNumber)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }
}

export default function Quotes() {
  const navigate = useNavigate();
  const [dcs, setDCs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [challan, setChallan] = useState(initialQuotes);
  const [showPreview, setShowPreview] = useState(false); 

  useEffect(() => {
    fetchAllQuotes().then(setDCs);
  }, []);

  const handleEdit = async (quoteNumber) => {
    try {
      const dcData = await getQuoteByNumber(quoteNumber);
      // Fetch items from delivery_items table for this challanNo
      let items = [];
      try {
        const itemsRes = await fetch(`http://localhost:4000/api/quotes/${encodeURIComponent(quoteNumber)}/items`);
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
      console.error('Error loading quotes for edit:', error);
      alert('Failed to load quotes for editing. Please try again.');
    }
  };

  const handleDelete = async (quoteNumber) => {
    if (!window.confirm(`Are you sure you want to delete Quote ${quoteNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteQuote(quoteNumber);
      const updatedDCs = await fetchAllQuotes();
      setDCs(updatedDCs);
      alert('Quote deleted successfully!');
    } catch (error) {
      console.error('Error deleting Quote:', error);
      alert(error.message || 'Failed to delete Quote. Please try again.');
    }
  };

  if (showPreview) {
    return (
      <div>
        {showPreview && (
          <QuotesPreview
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
      if (!a.quoteNumber) return 1;
      if (!b.quoteNumber) return -1;
      return String(a.quoteNumber).localeCompare(String(b.quoteNumber));
    });
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Quotes</h2>
          <button
            onClick={async () => {
              const nextQuoteNumber = await getNextQuotesNumber();
              const today = new Date().toISOString().split("T")[0];
              setChallan({ ...initialQuotes, quotesNumber: nextQuoteNumber, deliveryDate: today, isEditing: false });
              setShowPreview(true);
            }}
            style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}
          >
            Create New Quote
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} border={1}>
          <thead>
            <tr style={{ background: '#4472C4', color: 'white', fontSize: 18 }}>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Quotes No</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Supplier Name</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Delivery Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Client Name</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Requested By</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Grand Total</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDCs.map(dc => (
              <tr key={dc.challanNo} style={{ background: '#fff', fontSize: 14 }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.quotesNumber}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.date}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.supplierName}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.deliveryDate}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.clientAddress_name}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.requestedBy}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.grandTotal}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(dc.quotesNumber)}
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
                      onClick={() => handleDelete(dc.quotesNumber)}
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
