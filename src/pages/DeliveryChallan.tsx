import React, { useState, useEffect } from "react";

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
    const response = await fetch("http://localhost:4000/api/delivery-challans");
    if (!response.ok) throw new Error("Failed to fetch delivery challans");
    const dcs = await response.json();
    let maxNum = 0;
    let challanYear = "";
    dcs.forEach(dc => {
      if (dc.challanNo) {
        const num = extractChallanNumber(`${dc.challanNo}`);
        if (num > maxNum) {
          maxNum = num;
          challanYear = dc.challanYear;
        }
      }
    });
    // If no DCs exist, start from 1 and use current year
    if (!challanYear) {
      const now = new Date();
      const year = now.getFullYear();
      const startYear = year % 100;
      const endYear = (year + 1) % 100;
      challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    }
    const nextNum = (maxNum + 1).toString().padStart(3, "0");
    return `DC-${nextNum}/${challanYear}`;
  } catch (err) {
    // fallback to DC-001/currentYear
    const now = new Date();
    const year = now.getFullYear();
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    const challanYear = `${startYear.toString().padStart(2, "0")}-${endYear.toString().padStart(2, "0")}`;
    return `DC-001/${challanYear}`;
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
      ? `http://localhost:4000/api/delivery-challans/${dc.challanNo}`
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to save delivery challan');
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
      eway_bill_no: inv.eway_bill_no || "",
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
      setChallan({
        ...dcData,
        isEditing: true,
        items: dcData.items || []
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

  if (!showForm) {
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }} border={1}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th>Challan No</th>
              <th>Order date</th>
              <th>Dispatch Date</th>
              <th>Eway Bill</th>
              <th>Invoice #</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dcs.map(dc => (
              <tr key={dc.challanNo}>
                <td>{dc.challanNo}</td>
                <td>{dc.order_date}</td>
                <td>{dc.dispatch_date}</td>
                <td>{dc.eway_bill_no}</td>
                <td>{dc.invoiceNumber}</td>
                <td>{dc.remarks}</td>
                <td>
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
    <div style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 80, marginRight: 16 }} />
        <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22, flex: 1 }}>
          {challan.isEditing ? 'Edit Delivery Challan' : 'Delivery Challan'}
        </h2>
      </div>
      <div style={{ marginBottom: 12 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
         <div>
          <label>
            Dispatch Date:{" "}
            <input
              name="dispatch_date"
              type="date"
              value={challan.dispatch_date || ""}
              onChange={handleChange}
              style={{ width: 150, fontSize: 16 }}
            />
          </label>
        </div>
         <div>
          <label>
            Order Date:{" "}
            <input
              name="order_date"
              type="date"
              value={challan.order_date || ""}
              onChange={handleChange}
              style={{ width: 150, fontSize: 16 }}
            />
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <label>
            Bill To Address:{" "}
            <input
              name="bill_to_address"
              value={challan.bill_to_address || ""}
              onChange={handleChange}
              style={{ width: 150, fontSize: 16 }}
            />
          </label>
        </div>
        <div>
          <label>E-way Bill No: <input name="eway_bill_no" value={challan.eway_bill_no} onChange={handleChange} style={{ width: 150, fontSize: 16 }} /></label>
        </div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>Description</th>
            <th>Quantity</th>
            <th>Remarks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={idx}>
              <td><input name="item_description" value={item.item_description} onChange={e => handleItemChange(idx, e)} style={{ width: 200, fontSize: 16 }} /></td>
              <td><input name="quantity" value={item.quantity} onChange={e => handleItemChange(idx, e)} style={{ width: 60, fontSize: 16 }} /></td>
              <td><input name="remarks" value={item.remarks} onChange={e => handleItemChange(idx, e)} style={{ width: 120, fontSize: 16 }} /></td>
              <td><button type="button" onClick={() => removeItem(idx)} style={{ fontSize: 16, background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addItem} style={{ fontSize: 16, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', marginBottom: 16 }}>Add Item</button>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button type="button" onClick={handleSave} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>
          {challan.isEditing ? 'Update DC' : 'Save DC'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}
