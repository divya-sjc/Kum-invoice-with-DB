import React, { useState, useEffect } from "react";
import ChallanPreview from "../pages/ChallanPreview"; // Import the ChallanPreview component

// Editable Delivery Challan form based on PDF structure
const initialChallan = {
  challanNo: "",
  order_date: "",
  dispatch_date: "",
  bill_to_address: "",
  eway_bill_no: "",
  invoiceNumber: "",
  isEditing: false,
  items: [
    { id: 0, item_description: "",quantity: "", remarks: "",}
  ],
};

function extractChallanNumber(challanNo: string): number {
  const match = challanNo.match(/^DC-(\d{3})/);
  return match ? parseInt(match[1], 10) : 0;
}

async function getNextChallanNumber(): Promise<string> {
  try {
    const response = await fetch("http://localhost:4000/api/delivery-challans/next-number");
    if (!response.ok) throw new Error("Failed to fetch next number");
    const data = await response.json();
    return data.challanNo;
  } catch (err) {
    // fallback
    const now = new Date();
    const year = now.getFullYear();
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    const challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    return `DC-0001/${challanYear}`;
  }
}

async function fetchAllDCs() {
  try {
    const response = await fetch("http://localhost:4000/api/delivery-challans");
    if (!response.ok) {
      throw new Error('Failed to fetch delivery challans');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching delivery challans:', error);
    throw error;
  }
}

async function saveDC(dc) {
  try {
    if (!dc.challanNo)  {
      dc.challanNo = await getNextChallanNumber(); // <-- assign it!
    }
    const method = dc.isEditing ? "PUT" : "POST";
    const url = dc.isEditing
      ? `http://localhost:4000/api/delivery-challans/${encodeURIComponent(dc.challanNo)}`
      : "http://localhost:4000/api/delivery-challans";
    
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...dc,
        items: dc.items || []
      }),
    });

    if (!response.ok) {
      let errorText = await response.text();
      let errorMsg = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error || errorText;
      } catch (e) {
        // Not JSON, keep errorText
      }
      throw new Error(errorMsg || 'Failed to save delivery challan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving delivery challan:', error);
    throw error;
  }
}

async function deleteDC(challanNo) {
  try {
    const response = await fetch(`http://localhost:4000/api/delivery-challans/${encodeURIComponent(challanNo)}`, {
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

async function getDCByNumber(challanNo) {
  try {
    const response = await fetch(`http://localhost:4000/api/delivery-challans/${encodeURIComponent(challanNo)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch delivery challan');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching delivery challan:', error);
    throw error;
  }
}

export default function DeliveryChallan() {
  const [dcs, setDCs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [challan, setChallan] = useState(initialChallan);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false); // State to control preview visibility

  // Fetch invoice options on mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/invoices");
        if (!res.ok) {
          alert("Could not fetch invoices");
          return;
        }
        const invoices = await res.json();
        setInvoiceOptions(
          (invoices as Array<{ invoiceNumber?: string }>).filter((inv) => !!inv.invoiceNumber)
        );
      } catch (err) {
        console.error('Error fetching invoices:', err);
        alert("Could not fetch invoices");
      }
    };
    fetchInvoices();
  }, []);

  useEffect(() => {
    fetchAllDCs().then(setDCs);
  }, []);

  const handleFetchInvoices = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/invoices`);
      if (!res.ok) {
        console.error('Failed to fetch invoices:', await res.text());
        return alert("Could not fetch invoices");
      }
      const invoices = await res.json();
      // Ensure each invoice has an invoiceNumber property
      setInvoiceOptions(invoices.filter(inv => inv.invoiceNumber));
    } catch (err) {
      console.error('Error fetching invoices:', err);
      alert("Could not fetch invoices");
    }
  };

  const handleSelectInvoice = async (e) => {
    const invoiceNo = e.target.value;
    setInvoiceNumber(invoiceNo);
    if (!invoiceNo) return;
    // Fetch the selected invoice from backend for latest data
    const res = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(invoiceNo)}`);
    if (!res.ok) return alert("Invoice not found");
    const inv = await res.json();
    setSelectedInvoice(inv);
    setChallan(prev => ({
      ...prev,
      invoiceNumber: inv.invoiceNumber || "",
      bill_to_address: inv.deliveryAddress_address || "",
      order_date: inv.date || "",
      dispatch_date: inv.dispatch_date || "",
      eway_bill_no: inv.ewayBillRef || "",
      items: (inv.items || []).map(i => ({
      id: i.id || 0,
      item_description: i.item_description || "",
      quantity: i.quantity || "",
      remarks: i.Remarks || "",
      })),
    }));
  };

  const addItem = () => {
    setChallan((prev) => ({
      ...prev,
      items: [...prev.items, { id: 0, item_description: "", quantity: "", remarks: "", }],
    }));
  };

  const removeItem = (idx) => {
    setChallan((prev) => {
      const items = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChallan((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setChallan((prev) => {
      const items = [...prev.items];
      items[idx][name] = value;
      return { ...prev, items };
    });
  };

  const handleSave = async () => {
    try {
      const challanToSave = { ...challan };

      // If challanNo is empty, generate a new one
      if (!challanToSave.challanNo) {
        challanToSave.challanNo = await getNextChallanNumber();
      }

      // Validate required fields including dispatch_date
      if (
        !challanToSave.challanNo ||
        !challanToSave.order_date ||
        !challanToSave.dispatch_date ||
        !challanToSave.items?.length
      ) {
        alert('Please fill in all required fields (Challan No, Order Date, Dispatch Date, and at least one item)');
        return;
      }

  await saveDC(challanToSave);
  setShowForm(false);
  setChallan(initialChallan); // Reset form state after save
  const updatedDCs = await fetchAllDCs();
  setDCs(updatedDCs);
  alert(`Delivery Challan ${challan.isEditing ? 'updated' : 'saved'} successfully!`);
    } catch (error) {
      console.error('Error saving delivery challan:', error);
      alert(error.message || 'Failed to save delivery challan. Please try again.');
    }
  };

  const handleEdit = async (challanNo) => {
    try {
      const dcData = await getDCByNumber(challanNo);
      // Fetch items from delivery_items table for this challanNo
      let items = [];
      try {
        const itemsRes = await fetch(`http://localhost:4000/api/delivery-challans/${encodeURIComponent(challanNo)}/items`);
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
      setInvoiceNumber(dcData.invoiceNumber || '');
      setShowForm(true);
    } catch (error) {
      console.error('Error loading delivery challan for edit:', error);
      alert('Failed to load delivery challan for editing. Please try again.');
    }
  };

  const handleDelete = async (challanNo) => {
    if (!window.confirm(`Are you sure you want to delete Delivery Challan ${challanNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDC(challanNo);
      const updatedDCs = await fetchAllDCs();
      setDCs(updatedDCs);
      alert('Delivery Challan deleted successfully!');
    } catch (error) {
      console.error('Error deleting delivery challan:', error);
      alert(error.message || 'Failed to delete delivery challan. Please try again.');
    }
  };

  if (showPreview) {
    return (
      <ChallanPreview challan={challan} onBack={() => setShowPreview(false)} />
    );
  }

  if (!showForm) {
    // Sort delivery challans by invoiceNumber ascending
    const sortedDCs = [...dcs].sort((a, b) => {
      if (!a.invoiceNumber) return 1;
      if (!b.invoiceNumber) return -1;
      return String(a.invoiceNumber).localeCompare(String(b.invoiceNumber));
    });
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Delivery Challans</h2>
          <button
            onClick={async () => {
              const nextChallanNo = await getNextChallanNumber();
              const today = new Date().toISOString().split("T")[0];
              setChallan({ ...initialChallan, challanNo: nextChallanNo, dispatch_date: today, isEditing: false });
              setInvoiceNumber('');
              setShowForm(true);
            }}
            style={{ fontSize: 16, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}
          >
            Create New DC
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} border={1}>
          <thead>
            <tr style={{ background: '#4472C4', color: 'white', fontSize: 18 }}>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Challan No</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Order date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Dispatch Date</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Eway Bill</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Invoice #</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Remarks</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDCs.map(dc => (
              <tr key={dc.challanNo} style={{ background: '#fff', fontSize: 16 }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.challanNo}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.order_date}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.dispatch_date}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.eway_bill_no}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.invoiceNumber}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{dc.remarks}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(dc.challanNo)}
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
                      title="Edit this delivery challan"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dc.challanNo)}
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
                      title="Delete this delivery challan"
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

  return (
    <div style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24, position: 'relative', minHeight: '100vh', background: `url('/lovable-uploads/letterhead-bg.png') no-repeat right top`, backgroundSize: 'contain' }}>
      {/* Company header */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
            <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 22, color: '#2366a8', letterSpacing: 1 }}>VESHAD AND COMPANY</div>
              <div style={{ color: '#2366a8', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
                # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE, 
                BANGALORE - 560008, KARNATAKA, INDIA<br />
                Landline:- (91) - 80 - 25272041,  
                Mobile :- (91) 9036644721<br />
                Email:- veshad.blr@gmail.com // admin@veshad.com
              </div>
            </div>
          </div>
        </div>
        <div>
          <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
        </div>
        <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22, flex: 1 }}>
          {challan.isEditing ? 'Edit Delivery Challan' : 'Delivery Challan'}
        </h2>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>Company:</div>
          <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>VESHAD AND COMPANY</div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>
            # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,
            BANGALORE - 560008, KARNATAKA, INDIA<br />
            Landline:- (91) - 80 - 25272041,    
            Mobile :- (91) 9036644721<br />
            Email:- veshad.blr@gmail.com // admin@veshad.com<br />
            GST: 29DXRPS1061J1ZS
          </div>
        </div>
      <div>
          <hr style={{ border: 0, borderTop: '2px solid #000', margin: '12px 0' }} />
      </div>
      {/* Delivery Challan No, Order Date, Dispatch Date fields in a single flex row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, width: '100%' }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <label style={{ fontWeight: 'bold', fontSize: 16, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
            Delivery Challan No:
          </label>
          <input
            name="challanNo"
            value={challan.challanNo || ""}
            onChange={handleChange}
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
          />
        </div>
        <div style={{ flex: 1, marginRight: 12 }}>
          <label style={{ fontWeight: 'bold', fontSize: 16, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
            Order Date:
          </label>
          <input
            name="order_date"
            type="date"
            value={challan.order_date || ""}
            onChange={handleChange}
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: 'bold', fontSize: 16, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
            Dispatch Date:
          </label>
          <input
            name="dispatch_date"
            type="date"
            value={challan.dispatch_date || ""}
            onChange={handleChange}
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
          />
        </div>
      </div>
      <div>
          <hr style={{ border: 0, borderTop: '2px solid #000', margin: '12px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <label>Invoice Number: </label>
        <select
          value={invoiceNumber}
          onChange={handleSelectInvoice}
          onClick={handleFetchInvoices}
          style={{ width: 220, fontSize: 16 }}
        >
          <option value="">Select Invoice</option>
          {invoiceOptions.map(inv => (
            <option key={inv.invoiceNumber} value={inv.invoiceNumber}>
              {inv.invoiceNumber || 'No Number'}
            </option>
          ))}
        </select>
          <label>
            E-way Bill No: <input name="eway_bill_no" value={challan.eway_bill_no} onChange={handleChange} style={{ width: 150, fontSize: 16 }} />
          </label>
        <div><br /></div>
         </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 16, marginBottom: 4 }}>
            Bill To Address:
          </label>
          <textarea
            name="bill_to_address"
            value={challan.bill_to_address || ""}
            onChange={handleChange}
            rows={3}
            style={{ width: 300, fontSize: 16 }}
          />
        </div>
        </div>
      <table className="table-auto w-full text-sm border border-black" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 , justifyContent: 'space-between'}} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 350, border: '1px solid #000' }}>Description</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Quantity</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 200, border: '1px solid #000' }}>Remarks</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 80, border: '1px solid #000' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000', maxWidth: 350, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                <textarea
                  name="item_description"
                  value={item.item_description}
                  onChange={e => handleItemChange(idx, e)}
                  style={{ width: '100%', fontSize: 18, resize: 'vertical', minHeight: 40, maxWidth: 340, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', boxSizing: 'border-box' }}
                  rows={3}
                  wrap="soft"
                />
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="quantity" value={item.quantity} onChange={e => handleItemChange(idx, e)} style={{ width: 80, fontSize: 18, textAlign: 'center' }} />
              </td>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="remarks" value={item.remarks} onChange={e => handleItemChange(idx, e)} style={{ width: '100%', minWidth: 180, fontSize: 18 }} />
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <button type="button" onClick={() => removeItem(idx)} style={{ fontSize: 18, background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addItem} style={{ fontSize: 16, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', marginBottom: 16 }}>Add Item</button>
      <div><br /></div>
      <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.2, textAlign: "center",  }}>
            Confirm receipt of above in good order.
      </div>
      <div>
          <div><br /></div>
            Name: <br />
            Signature: 
            <div><br /></div>

            Date:<br />
            Company Seal: 

          </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button type="button" onClick={handleSave} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>
          {challan.isEditing ? 'Update DC' : 'Save DC'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>Cancel</button>
        <button type="button" onClick={() => setShowPreview(true)} style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Preview</button>
      </div>
    </div>
  );
}
