import React from "react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


export default function ChallanPreview({ challan, onBack }) {
  const challanRef = React.useRef<HTMLDivElement>(null);
  const handleDownloadPDF = async () => {
    if (!challanRef.current) return;
    try {
      // Use html2canvas to capture the preview at higher scale for crisp text
      const canvas = await html2canvas(challanRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 3
      } as any);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit page
      const imgProps = { width: canvas.width, height: canvas.height };
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Center image vertically if shorter than page
      const imgY = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;

      pdf.addImage(imgData, 'PNG', 0, imgY, pdfWidth, pdfHeight);

      pdf.save(`DeliveryChallan_${challan.challanNo || ''}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div ref={challanRef} style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24, position: 'relative', minHeight: '100vh', background: `url('/lovable-uploads/letterhead-bg.png') no-repeat right top`, backgroundSize: 'contain' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Company header */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
            <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
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
          <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>Company:</div>
          <div style={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>VESHAD AND COMPANY</div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>
            # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,
            BANGALORE - 560008, KARNATAKA, INDIA<br />
            Landline:- (91) - 80 - 35550915,    
            Mobile :- (91) 8317368522// 9611355110<br />
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
            style={{ width: '100%', fontSize: 20, height: 48, padding: '12px 12px', boxSizing: 'border-box' }}
            disabled
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
            style={{ width: '100%', fontSize: 20, height: 48, padding: '12px 12px', boxSizing: 'border-box' }}
            disabled
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
            style={{ width: '100%', fontSize: 20, height: 48, padding: '12px 12px', boxSizing: 'border-box' }}
            disabled
          />
        </div>
      </div>
      <div>
          <hr style={{ border: 0, borderTop: '2px solid #000', margin: '12px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <label>Invoice Number: 
            <input name="eway_bill_no" value={challan.invoiceNumber} style={{ width: 150, fontSize: 16 }} disabled />
        </label>
          <label>
            E-way Bill No: <input name="eway_bill_no" value={challan.eway_bill_no} style={{ width: 150, fontSize: 16 }} disabled />
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
            rows={4}
            style={{ width: 300, fontSize: 18, height: 80, padding: '12px', boxSizing: 'border-box' }}
            disabled
          />
        </div>
        </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, justifyContent: 'space-between' }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 440, border: '1px solid #000' }}>Description</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 80, border: '1px solid #000' }}>Quantity</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <textarea
                  name="item_description"
                  value={item.item_description}
                  style={{ width: '100%', fontSize: 16, resize: 'vertical', minWidth: 300, boxSizing: 'border-box' }}
                  rows={2}
                  wrap="soft"
                  disabled
                />
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="quantity" value={item.quantity} style={{ width: 60, fontSize: 16, textAlign: 'center' }} disabled />
              </td>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="remarks" value={item.remarks} style={{ width: '100%', minWidth: 120, fontSize: 16 , textAlign: 'left' }} disabled />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
            <div><br /></div>

          </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 32 }}>
  <button type="button" className="no-print" onClick={handleDownloadPDF} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Download PDF</button>
  <button type="button" className="no-print" onClick={onBack} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Back</button>
      </div>
    </div>
  );
}
