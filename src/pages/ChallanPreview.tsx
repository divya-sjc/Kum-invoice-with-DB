import React from "react";
import jsPDF from 'jspdf';


export default function ChallanPreview({ challan, onBack }) {
  const handleDownloadPDF = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 40;
    // Add watermark (centered, faded)
    const watermarkImg = window.location.origin + '/lovable-uploads/watermark.jpeg';
    const logoImg = window.location.origin + '/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png';
    // Load images as base64
    const getBase64FromUrl = async (url) => {
      const data = await fetch(url, { cache: 'reload' });
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
      });
    };
    try {
      // Logo (top left)
      const logoBase64 = String(await getBase64FromUrl(logoImg));
      doc.addImage(logoBase64, 'PNG', margin, y, 60, 60);
      // Watermark (center, faded)
      const watermarkBase64 = String(await getBase64FromUrl(watermarkImg));
      doc.addImage(watermarkBase64, 'JPEG', pageWidth/2-120, 250, 240, 240, undefined, 'NONE', 0.03);
      doc.setFont('Times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#2366a8');
      doc.text('VESHAD AND COMPANY', margin+70, y+20);
      doc.setFont('Times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor('#2366a8');
      doc.text('# 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE, BANGALORE - 560008, KARNATAKA, INDIA', margin+70, y+38)
      doc.text('Landline:- (91) - 80 - 35550915,  Mobile :- (91) 8317368522 / 9611355110', margin+70, y+48);
      doc.text('Email:- admin@veshad.com / veshad.blr@gmail.com', margin+70, y+58);
      // Move y below address block for Delivery Challan heading
      let headingBottomY = y + 100; // 18+80+extra spacing
      // Delivery challan heading below address
      doc.setFont('Times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#2366a8');
      doc.text('Delivery Challan', margin+200, headingBottomY);
      // Blue line (hr) below Delivery Challan
      doc.setDrawColor('#2366a8');
      doc.setLineWidth(2);
      doc.line(margin, headingBottomY + 12, pageWidth - margin, headingBottomY + 12);
      y = headingBottomY + 27;
      // Set text color to black for rest of content
      doc.setTextColor('#000');
      doc.setFontSize(11);
      // Challan No, Order Date, Dispatch Date in one line, spaced to fit page
      doc.setFont('Times', 'bold');
      doc.text('Challan No:', margin, y+10);
      doc.setFont('Times', 'normal');
      doc.text(`${challan.challanNo || ''}`, margin + 70, y+10);
      doc.setFont('Times', 'bold');
      doc.text('Order Date:', margin + 180, y+10);
      doc.setFont('Times', 'normal');
      doc.text(`${challan.order_date || ''}`, margin + 250, y+10);
      doc.setFont('Times', 'bold');
      doc.text('Dispatch Date:', margin + 340, y+10);
      doc.setFont('Times', 'normal');
      doc.text(`${challan.dispatch_date || ''}`, margin + 430, y+10);
      y += 26;
      // Blue line (hr) - place just below the current content
      doc.setDrawColor('#2366a8');
      doc.setLineWidth(2);
      doc.line(margin, y + 8, pageWidth - margin, y + 8);
      y += 20; // small gap after the line
      // Invoice Number and E-way Bill No in one line
      doc.setFont('Times', 'bold');
      doc.text('Invoice Number:', margin, y+10);
      doc.setFont('Times', 'normal');
      doc.text(`${challan.invoiceNumber || ''}`, margin + 90, y+10);
      doc.setFont('Times', 'bold');
      doc.text('E-way Bill No:', margin + 300, y+10);
      doc.setFont('Times', 'normal');
      doc.text(`${challan.eway_bill_no || ''}`, margin + 390, y+10);
      y += 26;
      // Bill To Address below
      doc.setFont('Times', 'bold');
      doc.text('Bill To Address:', margin, y+5);
      doc.setFont('Times', 'normal');
      const addressLines = doc.splitTextToSize(challan.bill_to_address || '', pageWidth - margin*2 - 20);
      doc.text(addressLines, margin + 90, y+5);
      y += addressLines.length * 13 + 15;
      // Table header with full width and borders
      const tableX = margin;
      const descW = pageWidth - margin*2 - 220; // Description wider
      const qtyW = 80;
      const remarksW = 140;
      doc.setFont('Times', 'bold');
      doc.setDrawColor(0,0,0);
      doc.setLineWidth(1);
      // Header row
      doc.rect(tableX, y, descW, 24);
      doc.rect(tableX + descW, y, qtyW, 24);
      doc.rect(tableX + descW + qtyW, y, remarksW, 24);
      doc.text('Description', tableX + 8, y + 16);
      doc.text('Quantity', tableX + descW + 8, y + 16);
      doc.text('Remarks', tableX + descW + qtyW + 8, y + 16);
      y += 24;
      doc.setFont('Times', 'normal');
      // Table rows with borders
      if (challan.items && challan.items.length) {
        challan.items.forEach(item => {
          let descLines = doc.splitTextToSize(String(item.item_description || ''), descW - 12);
          let remarksLines = doc.splitTextToSize(String(item.remarks || ''), remarksW - 12);
          // Limit to max 3 lines
          descLines = descLines.slice(0, 3);
          remarksLines = remarksLines.slice(0, 3);
          const rowLines = Math.max(descLines.length, remarksLines.length, 1);
          const maxLines = Math.min(rowLines, 3);
          const rowHeight = maxLines * 16;
          // Vertically center text in the row
          const descOffset = (rowHeight - descLines.length * 14) / 2;
          const remarksOffset = (rowHeight - remarksLines.length * 14) / 2;
          // Borders
          doc.rect(tableX, y, descW, rowHeight);
          doc.rect(tableX + descW, y, qtyW, rowHeight);
          doc.rect(tableX + descW + qtyW, y, remarksW, rowHeight);
          // Text: left align desc/remarks, horizontally center quantity
          doc.text(descLines, tableX + 8, y + descOffset + 8, { maxWidth: descW - 16, align: 'left' });
          doc.text(String(item.quantity || ''), tableX + descW + qtyW / 2, y + rowHeight / 2 + 4, { align: 'center' });
          doc.text(remarksLines, tableX + descW + qtyW + 8, y + remarksOffset + 8, { maxWidth: remarksW - 16, align: 'left' });
          y += rowHeight;
          if (y > 780) { doc.addPage(); y = 40; doc.addImage(watermarkBase64, 'JPEG', pageWidth/2-120, 250, 240, 240, undefined, 'NONE', 0.03); }
        });
      }
      y += 24;
      doc.setFont('Times', 'italic');
      doc.text('Confirm receipt of above in good order.', margin+200, y);
      y += 32;
      doc.setFont('Times', 'normal');
      doc.text('Name:', margin, y+20)
      doc.text('Date:', margin, y + 40);
      y += 28; // More space between lines
      doc.text('Signature:', margin, y + 80);
      doc.text('Company Seal:', margin, y + 100);
      y += 36; // Space for signature/seal
      doc.save(`DeliveryChallan_${challan.challanNo || ''}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF. Please check your internet connection and try again.');
      console.error('PDF generation error:', err);
    }
  };

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
                Landline:- (91) - 80 - 35550915,  
                Mobile :- (91) 8317368522// 9611355110<br />
                Email:- veshad@outlook.com / veshad.blr@gmail.com
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
            Email:- veshad@outlook.com / veshad.blr@gmail.com<br />
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
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
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
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
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
            style={{ width: '100%', fontSize: 16, padding: '4px 8px' }}
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
            rows={3}
            style={{ width: 300, fontSize: 16 }}
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
        <button type="button" onClick={handleDownloadPDF} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Download PDF</button>
        <button type="button" onClick={onBack} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Back</button>
      </div>
    </div>
  );
}
