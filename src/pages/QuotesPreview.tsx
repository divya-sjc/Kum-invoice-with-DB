import React from "react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from "react-router-dom";

const buttonStyle: React.CSSProperties = {
  fontSize: 18,
  background: '#2366a8',   // default blue, override per button
  color: 'white',
  border: 'none',
  borderRadius: 4,
  padding: '10px 40px',
  cursor: 'pointer',
  minWidth: 180,           // 👈 ensures consistent width
  height: 50,              // 👈 ensures consistent height
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function QuotesPreview({ challan, onBack, editable = false, onChange }) {
    const navigate = useNavigate();
  const challanRef = React.useRef<HTMLDivElement>(null);

  const handleInputChange = (e) => {
    if (!onChange) return;
    const { name, value } = e.target;
    onChange({ ...challan, [name]: value });
  };

  // For items
  const handleItemChange = (idx, e) => {
    if (!onChange) return;
    const { name, value } = e.target;
    const items = challan.items.map((item, i) =>
      i === idx ? { ...item, [name]: value } : item
    );
    onChange({ ...challan, items });
  };

  function filterQuotesFields(challan) {
  // Only include valid item fields for each item
  const filteredItems = Array.isArray(challan.items)
    ? challan.items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const total = quantity * unitPrice;
        return {
          item_description: item.item_description || "",
          quantity,
          unitPrice,
          total
        };
      })
    : [];
  return {
    quotesNumber: challan.quotesNumber || "",
    date: challan.date || "",
    revision: Number(challan.revision) || 1,
    supplierName: typeof challan.supplierName === 'string' ? challan.supplierName : '',
    supplierAddress: typeof challan.supplierAddress === 'string' ? challan.supplierAddress : '',
    supplierCity: typeof challan.supplierCity === 'string' ? challan.supplierCity : '',
    supplierPostalCode: typeof challan.supplierPostalCode === 'string' ? challan.supplierPostalCode : '',
    supplierState: typeof challan.supplierState === 'string' ? challan.supplierState : '',
    supplierPhone: typeof challan.supplierPhone === 'string' ? challan.supplierPhone : '',
    supplierEmail: typeof challan.supplierEmail === 'string' ? challan.supplierEmail : '',
    clientAddress_name: typeof challan.clientAddress_name === 'string' ? challan.clientAddress_name : '',
    clientAddress_address: typeof challan.clientAddress_address === 'string' ? challan.clientAddress_address : '',
    clientAddress_city: typeof challan.clientAddress_city === 'string' ? challan.clientAddress_city : '',
    clientAddress_postalCode: typeof challan.clientAddress_postalCode === 'string' ? challan.clientAddress_postalCode : '',
    clientAddress_state: typeof challan.clientAddress_state === 'string' ? challan.clientAddress_state : '',
    clientPhone: typeof challan.clientPhone === 'string' ? challan.clientPhone : '',
    clientEmail: typeof challan.clientEmail === 'string' ? challan.clientEmail : '',
    clientWebsite: typeof challan.clientWebsite === 'string' ? challan.clientWebsite : '',
    deliveryDate: typeof challan.deliveryDate === 'string' ? challan.deliveryDate : '',
    paymentTerms: typeof challan.paymentTerms === 'string' ? challan.paymentTerms : '',
    requestedBy: typeof challan.requestedBy === 'string' ? challan.requestedBy : '',
    department: typeof challan.department === 'string' ? challan.department : '',
    paypalCharges: paypalChargeAmount,
    grandTotal: finalGrandTotal,
    items: filteredItems,
    // terms: challan.terms || "",
  };
}

  async function saveQuotes(challan) {
    try {
      const filtered = filterQuotesFields(challan);
      // Ensure items array is always present and not empty
      if (!filtered.items || !Array.isArray(filtered.items) || filtered.items.length === 0) {
        alert('At least one item is required.');
        throw new Error('At least one item is required.');
      }
      // Ensure all required fields are present
      if (!filtered.quotesNumber || !filtered.date || !filtered.deliveryDate) {
        alert('Quotes Number, Order Date, and Delivery Date are required.');
        throw new Error('Missing required fields');
      }
      // Ensure supplierName is present and non-empty
      if (!filtered.supplierName || filtered.supplierName.trim() === "") {
        alert('Supplier Name is required.');
        throw new Error('Supplier Name is required.');
      }
      // POST or PUT as before
      let poNum = filtered.quotesNumber;
      const match = poNum.match(/^(?:QI[-\/]?)(\d{4})[-\/]?(\d{2}-\d{2})$/);
      if (match) {
        poNum = `QI/${match[1]}/${match[2]}`;
      } else {
        const numMatch = poNum.match(/(\d{4})/);
        const yearMatch = poNum.match(/(\d{2}-\d{2})/);
        if (numMatch && yearMatch) {
          poNum = `QI/${numMatch[1]}/${yearMatch[1]}`;
        }
      }
      const method = challan.isEditing ? 'PUT' : 'POST';
      const url = challan.isEditing
        ? `/api/quotes/${encodeURIComponent(poNum)}`
        : '/api/quotes';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filtered),
      });
      if (!response.ok) {
        let errorText = await response.text();
        let errorMsg = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorText;
        } catch (e) {}
        alert(errorMsg || 'Failed to save Quotes');
        throw new Error(errorMsg || 'Failed to save Quotes');
      }
      return await response.json();
    } catch (error) {
      alert(error.message || 'Error saving Quotes');
      throw error;
    }
  }

  const handleDownloadPDF = async () => {
    if (!challanRef.current) return;

    // Hide no-pdf elements before capture
    const noPdfElements = challanRef.current.querySelectorAll('.no-pdf');
    noPdfElements.forEach(el => (el as HTMLElement).style.display = 'none');

    try {
        const canvas = await html2canvas(challanRef.current, {
        useCORS: true,
        scale: 3
        } as any);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgProps = { width: canvas.width, height: canvas.height };
        const pdfWidth = pageWidth;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        const imgY = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;

        pdf.addImage(imgData, 'PNG', 0, imgY, pdfWidth, pdfHeight);
        pdf.save(`Quotes_${challan.purchaseNumber || ''}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
    } finally {
        // Show elements back
        noPdfElements.forEach(el => (el as HTMLElement).style.display = '');
    }
    };


  const grandTotal = challan.items.reduce(
  (sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)),
    0
  );
  const [paypalPercent, setPaypalPercent] = React.useState(
    challan.paypalPercent || ""
  );
  const isEdit = !!challan.isEditing;
  const paypalChargeAmount = isEdit
    ? (parseFloat(challan.paypalCharges) || 0)
    : (paypalPercent ? (grandTotal * parseFloat(paypalPercent) / 100) : 0);
  const finalGrandTotal = isEdit
    ? (parseFloat(challan.grandTotal) || (grandTotal + paypalChargeAmount))
    : (grandTotal + paypalChargeAmount);

  React.useEffect(() => {
    if (isEdit && challan.paypalCharges && grandTotal > 0) {
      const percent = (parseFloat(challan.paypalCharges) / grandTotal) * 100;
      setPaypalPercent(percent.toFixed(2));
    } else if (challan.paypalPercent) {
      setPaypalPercent(challan.paypalPercent);
    }
    // eslint-disable-next-line
  }, [isEdit, challan.paypalCharges, grandTotal]);


  return (
    <div ref={challanRef} style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24, position: 'relative', minHeight: '100vh', background: `url('/lovable-uploads/letterhead-bg.png') no-repeat right top`, backgroundSize: 'contain' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Company header */}
  <div style={{ position: 'relative', zIndex: 1, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 5 }}>
            <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 100, marginRight: 16 }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 22, color: '#2366a8', letterSpacing: 1 }}>VESHAD AND COMPANY</div>
              <div style={{ color: '#2366a8', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
                # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE, 
                BANGALORE - 560008, KARNATAKA, INDIA<br />
                Landline:- (91) - 80 - 35550915,  
                Mobile :- (91) 8317368522// 9611355110<br />
                Email:- veshad.blr@gmail.com // admin@veshad.com
              </div>
            </div>
          </div>
        </div>
        <div>
          <hr style={{ border: 0, borderTop: '2px solid #000', margin: '4px 0 12px 0' }} />
      </div>
      {/* Delivery Challan No, Order Date, Dispatch Date fields in a single flex row */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 2, width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Quote No:
            </label>
            <input
            name="quotesNumber"
            value={challan.quotesNumber || ""}
            style={{ width: '70%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            disabled
            />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Date:
            </label>
            <input
            name="date"
            type="date"
            value={challan.date || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '70%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Revision Number:
            </label>
            <input
            name="revision"
            value={challan.revision || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '70%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        </div>
      <div>
          <hr style={{ border: 0, borderTop: '2px solid #000', margin: '12px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 12 }}>
        {/* Supplier Details Column */}
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1, marginBottom: 4 }}>Supplier Details:</div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Name:</span>
            <input
                name="supplierName"
                value={challan.supplierName || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Address:</span>
            <input
                name="supplierAddress"
                value={challan.supplierAddress || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>City:</span>
            <input
                name="supplierCity"
                value={challan.supplierCity || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Postal Code:</span>
            <input
                name="supplierPostalCode"
                value={challan.supplierPostalCode || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '50%', marginLeft: 8, height: "auto" }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>State:</span>
            <input
                name="supplierState"
                value={challan.supplierState || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Phone:</span>
            <input
                name="supplierPhone"
                value={challan.supplierPhone || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Email:</span>
            <input
                name="supplierEmail"
                value={challan.supplierEmail || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
        </div>
        {/* Vertical Divider */}
        <div style={{ width: 2, background: '#e2e8f0', margin: '0 8px', minHeight: 220, alignSelf: 'stretch' }} />
        {/* Delivery Details Column */}
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1, marginBottom: 4 }}>Client Details:</div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Name:</span>
            <input
                name="clientAddress_name"
                value={challan.clientAddress_name || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Address:</span>
            {editable ? (
              <textarea
                name="clientAddress_address"
                value={challan.clientAddress_address || ''}
                onChange={handleInputChange}
                style={{
                  width: '80%',
                  marginLeft: 8,
                  minHeight: 24,
                  maxHeight: 120,
                  fontSize: 16,
                  resize: 'vertical',
                  overflow: 'auto',
                  boxSizing: 'border-box',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
                rows={1}
              />
            ) : (
              <div
                style={{
                  width: '80%',
                  marginLeft: 8,
                  minHeight: 24,
                  fontSize: 16,
                  border: '1px solid #ccc',
                  background: '#fff',
                  resize: 'none',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  padding: 8,
                }}
              >
                {challan.clientAddress_address || ''}
              </div>
            )}
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>City:</span>
            <input
                name="clientAddress_city"
                value={challan.clientAddress_city || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Postal Code:</span>
            <input
                name="clientAddress_postalCode"
                value={challan.clientAddress_postalCode || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '50%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>State:</span>
            <input
                name="clientAddress_state"
                value={challan.clientAddress_state || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Phone:</span>
            <input
                name="clientPhone"
                value={challan.clientPhone || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Email:</span>
            <input
                name="clientEmail"
                value={challan.clientEmail || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
            <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Web:</span>
            <input
                name="clientWebsite"
                value={challan.clientWebsite || ''}
                onChange={editable ? handleInputChange : undefined}
                disabled={!editable}
                style={{ width: '80%', marginLeft: 8, height: "auto"  }}
            />
            </div>
        </div>
        </div>

       <div>
          <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
        </div>

         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 2, width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Delivery Date:
            </label>
            <input
            name="deliveryDate"
            type="date"
            value={challan.deliveryDate || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '70%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Payment Terms:
            </label>
            <input
            name="paymentTerms"
            value={challan.paymentTerms || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '100%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Requested BY:
            </label>
            <input
            name="requestedBy"
            value={challan.requestedBy || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '100%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', fontSize: 18, color: '#2366a8', letterSpacing: 1, display: 'block', marginBottom: 4, textAlign: 'center' }}>
            Department:
            </label>
            <input
            name="department"
            value={challan.department || ""}
            onChange={editable ? handleInputChange : undefined}
            disabled={!editable}
            style={{ width: '100%', fontSize: 20, height: "auto", lineHeight: "1.5", padding: "6px 8px", boxSizing: 'border-box', textAlign: 'center'}}
            />
        </div>
        </div>

         <div>
          <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
        </div>

    
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, justifyContent: 'space-between' }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 440, border: '1px solid #000' }}>Description</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 80, border: '1px solid #000' }}>Quantity</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Unit Price</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <textarea
                  name="item_description"
                  value={item.item_description}
                  onChange={editable ? (e) => handleItemChange(idx, e) : undefined}
                  style={{ width: '100%', fontSize: 16, resize: 'vertical', minWidth: 300, boxSizing: 'border-box' }}
                  rows={2}
                  wrap="soft"
                  disabled={!editable}
                />
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="quantity" value={item.quantity}  onChange={editable ? (e) => handleItemChange(idx, e) : undefined}
                  disabled={!editable} style={{ width: 60, fontSize: 16, textAlign: 'center' }} />
              </td>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="unitPrice" value={item.unitPrice} onChange={editable ? (e) => handleItemChange(idx, e) : undefined}
                  disabled={!editable} style={{ width: '100%', minWidth: 120, fontSize: 16 , textAlign: 'left' }} />
              </td>
               <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="total" value={((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} style={{ width: '100%', minWidth: 120, fontSize: 16 , textAlign: 'left' }} disabled />
              </td>
              {editable && (
                <td>
                    <button
                    className="no-pdf"
                    type="button"
                    onClick={() => {
                        const newItems = challan.items.filter((_, i) => i !== idx);
                        onChange({ ...challan, items: newItems });
                    }}
                    style={{
                        background: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontSize: 18,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                     title="Remove"
                    >
                    🗑️
                    </button>
                </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div style={{ margin: '12px 0' }}>
            <button
            className="no-pdf"
            type="button"
            onClick={() => {
                const newItems = [
                ...challan.items,
                { item_description: "", quantity: "", unitPrice: "", total: "" }
                ];
                onChange({ ...challan, items: newItems });
            }}
            style={{
                fontSize: 16,
                background: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '6px 18px',
                cursor: 'pointer'
            }}
            >
            + Add Item
            </button>
        </div>
        )}
        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 18, margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <span>Paypal Charges:</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={paypalPercent}
            onChange={e => {
              setPaypalPercent(e.target.value);
              if (onChange) onChange({ ...challan, paypalPercent: e.target.value });
            }}
            style={{ width: 60, fontSize: 18, marginLeft: 8, marginRight: 4, textAlign: 'right' }}
            disabled={!editable}
            placeholder="%"
          />
          <span>%</span>
          <span style={{ marginLeft: 12 }}>
            ₹ {paypalChargeAmount.toFixed(2)}
          </span>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 18, margin: '16px 0' }}>
          Grand Total: ₹ {finalGrandTotal.toFixed(2)}
        </div>
      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2, textAlign: "left", marginTop: 24, marginBottom: 4 }}>
        Terms & Condition
      </div><br />
      
       {editable ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Array.isArray(challan.terms) ? challan.terms : 
              (challan.terms ?? `1. Product must be 100% New & Original.
        2. Product to be issued with COC from USA OEM.
        3. Shipment to be done to Virginia (address shall be given shortly)
        4. Product to be delivered immediately after receiving payment.
        5. Payment done Ex.works Virginia, USA.
        6. Payment 100% Advance`)
                .split(/\n+/)
            ).map((term, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => {
                    const newTerms = [...(Array.isArray(challan.terms) ? challan.terms : [])];
                    newTerms[idx] = e.target.value;
                    onChange({ ...challan, terms: newTerms });
                  }}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    padding: "6px 8px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
                <button
                  type="button"
                  className="no-pdf"
                  onClick={() => {
                    const newTerms = [...(Array.isArray(challan.terms) ? challan.terms : [])];
                    newTerms.splice(idx, 1);
                    onChange({ ...challan, terms: newTerms });
                  }}
                  style={{
                    background: "#e53e3e",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
            <button
              type="button"
              className="no-pdf"
              onClick={() => {
                const newTerms = [...(Array.isArray(challan.terms) ? challan.terms : [])];
                newTerms.push("");
                onChange({ ...challan, terms: newTerms });
              }}
              style={{
                marginTop: 8,
                fontSize: 14,
                background: "#3182ce",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              + Add Condition
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.6,
              textAlign: "left",
              padding: 8,
              boxSizing: "border-box",
              minHeight: 96,
              border: "1px solid #ccc",
              background: "#fff",
              marginBottom: 16,
            }}
          >
            {(Array.isArray(challan.terms) ? challan.terms : 
              (challan.terms ?? `1. Product must be 100% New & Original.
        2. Product to be issued with COC from USA OEM.
        3. Shipment to be done to Virginia (address shall be given shortly)
        4. Product to be delivered immediately after receiving payment.
        5. Payment done Ex.works Virginia, USA.
        6. Payment 100% Advance`)
                .split(/\n+/)
            ).map((term, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                {`${idx + 1}. ${term.trim()}`}
              </div>
            ))}
          </div>
        )}
     

      {/* Signature/Date/Seal block, always visible and spaced */}
      <div style={{ marginTop: 32, marginBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ flex: 1, fontSize: 18, minWidth: 200 }}>
            <div style={{ marginBottom: 16 }}>Name:</div>
            <div>Signature:</div>
          </div>
          <div style={{ flex: 1, fontSize: 18, minWidth: 200 }}>
            <div style={{ marginBottom: 16 }}>Date:</div>
            <div>Company Seal:</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 32 }}>
        {editable && (
            <button
            className="no-pdf"
            type="button"
            onClick={async () => {
                try {
                    await saveQuotes(challan);
                    window.location.reload();
                    } catch (err) {
                    console.error(err);
                    alert("Error saving purchase order");
                    }
            }}
            style={{ ...buttonStyle, background: "#2366a8" }}
            >
            {challan?.isEditing ? "Update" : "Save"}
            </button>
        )}
        <button
            className="no-pdf"
            type="button"
            onClick={handleDownloadPDF}
            style={{ ...buttonStyle, background: "#38a169" }}
        >
            Download PDF
        </button>
        <button
            className="no-pdf"
            type="button"
            onClick={onBack}
            style={{ ...buttonStyle, background: "#718096" }}
        >
            Back
        </button>
            </div>
            </div>
        );
}

