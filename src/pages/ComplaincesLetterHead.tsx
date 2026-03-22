import React, { useState, useEffect } from "react";
import { jsPDF } from 'jspdf';
import autoTable from "jspdf-autotable";


const draftTemplate1 = `Veshad And Company	
2876,1st Main Kodihalli,
HAL 2nd Stage, Bangalore -560008.Karnataka.
(91) - 80 - 35550915
+91 8317368522 / 9611355110
`;


const draftTemplate2 = `
Veshad And Company hereby certifies that all products supplied are sourced exclusively from the manufacturer’s authorized distributors or approved channel partners. We warrant and confirm that these products comply with the original manufacturer’s specifications and are genuine, new, and unused.
A valid 6-month warranty applies from the date of delivery, and supporting documentation for this certification is maintained by both Veshad And Company.
Purchase Order requirement agreed on between Veshad And Company and Customer.
`;


type Letter = {
  id?: number;
  customerName: string;
  poNumber: string;
  poDate: string;
  DCDate: string;
  DCNumber: string;
  body: string;
  created_at?: string;
  updated_at?: string;
  items: { id?: number; p_n: string; make: string; quantity: string }[];
};


const initialLetter: Letter = {
  customerName: "",
  poNumber: "",
  poDate: "",
  DCDate: "",
  DCNumber: "",
  body: draftTemplate2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [],
};

function fetchAllLetters() {
  return fetch("/api/coc").then(r => r.json());
}

function saveLetter(letter: Letter) {
  return fetch("/api/coc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(letter),
  }).then(r => r.json());
}

export default function ComplaincesLetterHead() {
  // Save handler for creating or updating a letter and its items
  const handleSave = async () => {
    if (!editableDraft.trim()) return;
    try {
      let result;
      if (letter.id) {
        // Edit mode: update existing letter
        result = await fetch(`/api/coc/${letter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...letter, body: editableDraft, making: letter.items }),
        }).then(r => r.json());
      } else {
        // Create mode: new letter
        result = await fetch('/api/coc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...letter, body: editableDraft, making: letter.items }),
        }).then(r => r.json());
        if (result && result.id) {
          setLetter((prev) => ({ ...prev, id: result.id }));
        }
      }
      if (result && (result.id || result.success)) {
        setShowForm(false);
        setPreviewMode(false);
        fetchAllLetters().then(setLetters);
        setLastSavedLetter({ ...letter, body: editableDraft });
      } else {
        alert('Failed to save letter. Please try again.');
      }
    } catch (e) {
      alert('Error saving letter. Please check your connection or try again.');
    }
  };

  // --- STATE HOOKS ---
  const [letters, setLetters] = useState<Letter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [letter, setLetter] = useState<Letter>(initialLetter);
  const [lastSavedLetter, setLastSavedLetter] = useState<Letter>(initialLetter);
  const [previewMode, setPreviewMode] = useState(false);
  const [editableDraft, setEditableDraft] = useState(draftTemplate2);
  const [selectedLetterIds, setSelectedLetterIds] = useState<number[]>([]);

  // Table is editable if in form mode and not previewing
  const editable = showForm && !previewMode;

  // --- coc_making table helpers ---
  // Fetch a letter (COC) by id, including its making items
  const fetchLetterById = async (id: number) => {
    const res = await fetch(`/api/coc/${id}`);
    const data = await res.json();
    // The making property contains the coc_making items
    setLetter({ ...data, items: data.making || [] });
    setEditableDraft(data.body || draftTemplate2);
  };

  // Frontend-only item handlers
  const addCocMakingItem = () => {
    setLetter((prev) => ({
      ...prev,
      items: [...(prev.items || []), { p_n: '', make: '', quantity: '' }]
    }));
  };

  const updateCocMakingItem = (idx, field, value) => {
    setLetter((prev) => {
      const items = prev.items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      );
      return { ...prev, items };
    });
  };

  const deleteCocMakingItem = (idx) => {
    setLetter((prev) => {
      const items = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items };
    });
  };
  // Handler for form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLetter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Select/deselect a letter in the list
  const handleSelectLetter = (id: number) => {
    setSelectedLetterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select/deselect all letters
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLetterIds(letters.map((l) => l.id!));
    } else {
      setSelectedLetterIds([]);
    }
  };

  // Delete selected letters
  const handleDeleteSelected = async () => {
    if (!selectedLetterIds.length) return;
    if (!window.confirm('Delete selected letters?')) return;
    for (const id of selectedLetterIds) {
      await fetch(`/api/coc/${id}`, { method: 'DELETE' });
    }
    setSelectedLetterIds([]);
    fetchAllLetters().then(setLetters);
  };

  useEffect(() => {
    fetchAllLetters().then(setLetters);
  }, []);

  useEffect(() => {
    if (showForm && letter.id) {
      fetchLetterById(letter.id);
    } else if (showForm) {
      setEditableDraft(letter.body || draftTemplate2);
    }
  }, [showForm, letter.id]);

  // Always fetch latest letter (with making) when entering preview mode
  useEffect(() => {
    if (previewMode && letter.id) {
      fetchLetterById(letter.id);
    }
  }, [previewMode, letter.id]);

  // ...other handlers (handleChange, handleDraftChange, handleSave, etc.) remain unchanged...

  // Only show DOCX-style layout in preview mode and when showForm is true
  // Download the current letter as a PDF using jsPDF
  const handleDownloadPDF = async () => {
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 40;
    // Add watermark (centered, faded)
      const watermarkImg = '/lovable-uploads/watermark.jpeg';
      const logoImg = '/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png';
      const getBase64FromUrl = async (url) => {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => resolve(reader.result);
        });
      };
      const logoBase64 = await getBase64FromUrl(logoImg) as string;
      doc.addImage(logoBase64, 'PNG', margin, y, 60, 60);
      const watermarkBase64 = await getBase64FromUrl(watermarkImg) as string;
      doc.addImage(watermarkBase64, 'JPEG', pageWidth/2-120, 250, 240, 240, undefined, 'NONE', 0.03);
      doc.setFont('Times', 'bold');
      doc.setFontSize(16);
      doc.setTextColor('#2366a8');
      doc.text('VESHAD AND COMPANY', margin+70, y+20);
      doc.setFont('Times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#2366a8');
      doc.text('# 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE, BANGALORE - 560008, KARNATAKA, INDIA', margin+70, y+38)
      doc.text('Landline:- (91) - 80 - 35550915,  Mobile :- 8317368522 / 9611355110', margin+70, y+48);
      doc.text('Email:- admin@veshad.com / veshad.blr@gmail.com', margin+70, y+58);
    doc.setDrawColor(35, 102, 168);
    doc.setLineWidth(2);
    doc.line(margin, y + 80, pageWidth - margin, y + 80);

    y += 110;

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('CERTIFICATE OF COMPLIANCE', pageWidth / 2, y, { align: 'center' });
    y += 50;

    // Customer info
    doc.setFontSize(12);
    doc.text(`CUSTOMER NAME: ${letter.customerName || ''}`, margin, y);
    y += 50;

    // Table header
    doc.setFont("times", "bold");
    doc.text("P/N", margin, y);
    doc.text("Make", margin + 250, y);
    doc.text("Order Quantity", margin + 380, y);
    y += 10;
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // Table rows
    (letter.items || []).forEach((item) => {
    doc.setFont("times", "normal"); // normal body font
    doc.rect(margin, y - 10, pageWidth - 2 * margin, 20); // border rectangle per row
    doc.text(String(item.p_n ?? ""), margin + 5, y);
    doc.text(String(item.make ?? ""), margin + 250, y);
    doc.text(String(item.quantity ?? ""), margin + 380, y);
    y += 20;
    });

    doc.setFont("times", "normal");
    y += 30;
    doc.text(`PO Number: ${letter.poNumber || ''}`, margin, y);
    doc.text(`PO Date: ${letter.poDate || ''}`, margin + 250, y);
    y += 16;
    doc.text(`DC Number: ${letter.DCNumber || ''}`, margin, y);
    doc.text(`DC Date: ${letter.DCDate || ''}`, margin + 250, y);
    y += 24;

    const bodyLines = doc.splitTextToSize(letter.body || '', pageWidth - margin * 2);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 14 + 10;

    y += 30;
    doc.text('Certified by: Capt Kumaresh', margin, y);
    y += 18;
    doc.text('Title: Managing Director', margin, y);
    y += 18;
    doc.text(`Date: ${letter.updated_at ? letter.updated_at.slice(0, 10) : ''}`, margin, y);

    doc.save(`Veshad_Letter_${letter.DCDate || 'export'}.pdf`);
  } catch (err) {
    console.error(err);
    alert('Failed to generate PDF. Please check console for details.');
  }
};




  if (previewMode && showForm) {
    return (
      <div style={{
        fontFamily: 'Times New Roman, serif',
        fontSize: 16,
        maxWidth: 800,
        margin: '0 auto',
        padding: 40,
        background: '#fff',
        border: '1px solid #ccc',
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* Company Header */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
          <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 100 }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 22, color: '#2366a8', letterSpacing: 1 }}>
              VESHAD AND COMPANY
            </div>
            <div style={{ color: '#2366a8', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
              2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,<br />
              BANGALORE - 560008, KARNATAKA, INDIA<br />
              Landline: (91) - 80 - 35550915, Mobile: 8317368522 / 9611355110<br />
              Email: veshad@outlook.com / veshad.blr@gmail.com<br />
              GST: 29DXRPS1061J1ZS
            </div>
          </div>
        </div>
        <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />

        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 20, margin: '24px 0 16px 0', letterSpacing: 1 }}>
          CERTIFICATE OF COMPLIANCE
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>CUSTOMER NAME: <input name="customerName" type="text" value={letter.customerName} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, justifyContent: 'space-between' }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 440, border: '1px solid #000' }}>P/N</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 80, border: '1px solid #000' }}>Make</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Order Quantity</th>
          </tr>
        </thead>
        <tbody>
          {letter.items && letter.items.length > 0 ? (
            letter.items.map((item, idx) => (
                <tr key={item.id !== undefined ? `item-${item.id}-${idx}` : `idx-${idx}-${item.p_n}` }>
                <td style={{ padding: 8, border: '1px solid #888' }}>{item.p_n}</td>
                <td style={{ padding: 8, border: '1px solid #888' }}>{item.make}</td>
                <td style={{ padding: 8, border: '1px solid #888' }}>{item.quantity}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: 8, border: '1px solid #888' }}>
                No items found in database.
              </td>
            </tr>
          )}
        </tbody>
      </table>
        {/* Details */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 200 }}>
            <div><b>PO Number:</b> {letter?.poNumber}</div>
            <div><b>PO Date:</b> {letter?.poDate}</div>
          </div>
          <div style={{ display: 'flex', gap: 215 }}>
            <div><b>DC Number:</b> {letter?.DCNumber}</div>
            <div><b>DC Date:</b> {letter?.DCDate}</div>
          </div>
        </div>

        {/* Certificate Body */}
        <div style={{
          margin: '24px 0',
          whiteSpace: 'pre-line',
          fontSize: 16,
          lineHeight: 1.7
        }}>
          {letter?.body}
        </div>

        {/* Signature Block */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-start', gap: 80 }}>
          <div>
            <div>Certified by: Capt Kumaresh</div>
            <div style={{ marginTop: 24 }}>Title: Managing Director</div>
            <div style={{ marginTop: 24 }}>Date: {letter?.updated_at ? letter.updated_at.slice(0, 10) : ''}</div>
          </div>
        </div>
        {/* Action buttons at the bottom (not fixed) */}
        <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={() => {
              setEditableDraft(letter.body || draftTemplate2);
              setPreviewMode(false);
            }}
            style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}
          >
            Edit
          </button>
          <button type="button" onClick={handleDownloadPDF} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Download PDF</button>
          <button type="button" onClick={() => { setShowForm(false); setPreviewMode(false); }} style={{ fontSize: 18, background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Back</button>
        </div>
      </div>
    );
  }

// All logic and handlers should be inside the component, not after the return statement.

  if (!showForm) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Complainces Letters</h2>
          <div>
            <button onClick={() => { setLetter({ ...initialLetter, body: draftTemplate2 }); setShowForm(true); }} style={{ fontSize: 16, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer', marginRight: 12 }}>Create New Letter</button>
            <button onClick={handleDeleteSelected} disabled={!selectedLetterIds.length} style={{ fontSize: 16, background: selectedLetterIds.length ? '#e53e3e' : '#ccc', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: selectedLetterIds.length ? 'pointer' : 'not-allowed' }}>Delete Selected</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #888' }} border={1}>
          <thead>
            <tr style={{ background: '#4472C4' }}>
              <th style={{ border: '1px solid #888', color: 'white' }}><input type="checkbox" onChange={handleSelectAll} checked={selectedLetterIds.length === letters.length && letters.length > 0} /></th>
              <th style={{ border: '1px solid #888', color: 'white' }}>customerName</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>PONumber</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>poDate</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>DCNumber</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>DCDate</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>Body</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>updated_at</th>
              <th style={{ border: '1px solid #888', color: 'white' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {letters.map(l => (
              <tr key={l.id}>
                <td style={{ border: '1px solid #888' }}><input type="checkbox" checked={selectedLetterIds.includes(l.id)} onChange={() => handleSelectLetter(l.id)} /></td>
                <td style={{ fontSize: 13, maxWidth: 100, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.customerName}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.poNumber}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.poDate}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.DCNumber}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.DCDate}</td>
                <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.body.length > 120 ? l.body.slice(0, 120) + '...' : l.body}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.updated_at}</td>
                <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888', textAlign: 'center', verticalAlign: 'middle' }}><button onClick={() => { setLetter(l); setPreviewMode(true); setShowForm(true); }}>Preview</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (previewMode) {
    // ...existing code...
    return (
      <div style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24, position: 'relative', minHeight: '100vh', background: `url('/lovable-uploads/letterhead-bg.png') no-repeat right top`, backgroundSize: 'contain' }}>
        {/* Company header */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
            <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 22, color: '#2366a8', letterSpacing: 1 }}>VESHAD AND COMPANY</div>
              <div style={{ color: '#2366a8', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
                # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,<br />
                BANGALORE - 560008, KARNATAKA, INDIA<br />
                Landline:- (91) - 80 - 35550915
                Mobile :- 8317368522 / 9611355110<br />
                Email:- veshad@outlook.com / veshad.blr@gmail.com
              </div>
            </div>
          </div>
          <div>
            <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8, minHeight: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>Date:</span> <span>{letter.poDate}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>To:</span><br />
            <div style={{ whiteSpace: 'pre-line', marginLeft: 8 }}>{letter.DCDate}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>From:</span><br />
            <div style={{ whiteSpace: 'pre-line', marginLeft: 8 }}>{draftTemplate2}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-line' }}>{draftTemplate2}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>Subject:</span> <span style={{ marginLeft: 8 }}>{letter.body}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-wrap', marginLeft: 8 }}>{letter.body}</div>
          </div>
        </div>
        {/* Action buttons at the bottom */}
        <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', justifyContent: 'center', gap: 16, position: 'fixed', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.95)', padding: 24, zIndex: 10, borderTop: '1px solid #ccc' }}>
          <button
            type="button"
            onClick={() => {
              setEditableDraft(letter.body || draftTemplate2);
              setPreviewMode(false);
            }}
            style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}
          >
            Edit
          </button>
          <button type="button" onClick={handleDownloadPDF} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Download PDF</button>
          <button type="button" onClick={() => { setShowForm(false); setPreviewMode(false); }} style={{ fontSize: 18, background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, maxWidth: 900, margin: '0 auto', padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* Watermark logo */}
      <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ position: 'absolute', right: 0, top: 0, opacity: 0.08, height: '90%', zIndex: 0 }} />
      {/* Company header */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
          <img src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" alt="Logo" style={{ height: 60, marginRight: 16 }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 22, color: '#2366a8', letterSpacing: 1 }}>VESHAD AND COMPANY</div>
            <div style={{ color: '#2366a8', fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>
              # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,
              BANGALORE - 560008, KARNATAKA, INDIA<br />
              Landline:- (91) - 80 - 35550915,    
              Mobile :- 8317368522 / 9611355110<br />
              Email:- veshad@outlook.com / veshad.blr@gmail.com<br />
              GST: 29DXRPS1061J1ZS
            </div>
            <div>
              
            </div>
          </div>
        </div>
        <div>
          <hr style={{ border: 0, borderTop: '2px solid #2366a8', margin: '12px 0' }} />
        </div>
      </div>
        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 20, margin: '24px 0 16px 0', letterSpacing: 1, textDecoration: 'underline' }}>
          CERTIFICATE OF COMPLIANCE
        </div>
      <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <label>CUSTOMER NAME: <input name="customerName" type="text" value={letter.customerName} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, justifyContent: 'space-between' }} border={1}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 440, border: '1px solid #000' }}>P/N</th>
            <th style={{ textAlign: 'center', padding: '8px', minWidth: 80, border: '1px solid #000' }}>Make</th>
            <th style={{ textAlign: 'left', padding: '8px', minWidth: 100, border: '1px solid #000' }}>Order Quantity</th>
          </tr>
        </thead>
        <tbody>
          {letter.items.map((item, idx) => (
            <tr key={item.id !== undefined ? `item-${item.id}` : `idx-${idx}-${item.p_n}` }>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <textarea
                  name="p_n"
                  value={item.p_n}
                  onChange={editable ? (e) => updateCocMakingItem(idx, 'p_n', e.target.value) : undefined}
                  style={{ width: '100%', fontSize: 16, resize: 'vertical', minWidth: 300, boxSizing: 'border-box' }}
                  rows={2}
                  wrap="soft"
                  disabled={!editable}
                />
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="make" value={item.make}  onChange={editable ? (e) => updateCocMakingItem(idx, 'make', e.target.value) : undefined}
                  disabled={!editable} style={{ width: 60, fontSize: 16, textAlign: 'center' }} />
              </td>
              <td style={{ verticalAlign: 'top', padding: '6px', border: '1px solid #000' }}>
                <input name="quantity" value={item.quantity} onChange={editable ? (e) => updateCocMakingItem(idx, 'quantity', e.target.value) : undefined}
                  disabled={!editable} style={{ width: '100%', minWidth: 120, fontSize: 16 , textAlign: 'left' }} />
              </td>
              {editable && (
                <td>
                  <button
                    className="no-pdf"
                    type="button"
                    onClick={() => deleteCocMakingItem(idx)}
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
        <button
          type="button"
          onClick={addCocMakingItem}
          style={{
            fontSize: 16,
            background: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '6px 18px',
            cursor: 'pointer',
            marginBottom: 12
          }}
        >
          Add Row
        </button>
      )}
        <div style={{ display: 'flex', gap: 120, marginBottom: 16, alignItems: 'center' }}>
          <label>PO No: <input name="poNumber" type="text" value={letter.poNumber} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
          <label>PO Date: <input name="poDate" type="date" value={letter.poDate} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ display: 'flex', gap: 120, marginBottom: 16, alignItems: 'center' }}>
          <label>DC No: <input name="DCNumber" type="text" value={letter.DCNumber} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
          <label>DC Date: <input name="DCDate" type="date" value={letter.DCDate} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>{draftTemplate2}</label>
        </div><br /><br />
        <div style={{ marginBottom: 16 }}>
          <label>Certified By: <input name="customerName" type="text" value="Capt Kumaresh" onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Title: <input name="title" type="text" value="Managing Director" onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Date: <input name="customerName" type="text" value={letter.updated_at} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" onClick={handleSave} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>Save Letter</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16  }}>Cancel</button>
          <button type="button" onClick={() => setPreviewMode(true)} style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16  }}>Preview</button>
        </div>
      </div>
    </div>
  );
}
