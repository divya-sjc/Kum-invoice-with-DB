import React, { useState, useEffect } from "react";
import jsPDF from 'jspdf';

const draftTemplate1 = `To,
[....Name......]
[Address Line 1]
[Address Line 2]
[address Line 3]
`;

const draftTemplate2 = `Veshad And Company	
2876,1st Main Kodihalli,
HAL 2nd Stage, Bangalore -560008.Karnataka.
(91) - 80 - 35550915
+91 8317368522 / 9611355110
`;

const draftTemplate3 = `
Dear Sir/Madam,
`;

const draftTemplate4 = `
We are pleased to submit our budgetary quotation for the supply of [.................] as per your requirement. Kindly find the details below:

[Add your table or details here]

Thank you and looking forward to your valued order.

Yours faithfully,
For VESHAD AND COMPANY


[Signature]



Mrs. Suganya Kumaresh
Proprietor
`;

const sampleTable = `
| Item           | Quantity | Price  |
|----------------|----------|--------|
| Example 1      | 10       | 100.00 |
| Example 2      | 5        | 50.00  |`;

type Letter = {
  id?: number;
  to: string;
  subject: string;
  body: string;
  date: string;
};

const initialLetter: Letter = {
  to: "",
  subject: "",
  body: draftTemplate4,
  date: new Date().toISOString().slice(0, 10),
};

function fetchAllLetters() {
  return fetch("/api/letters").then(r => r.json());
}

function saveLetter(letter: Letter) {
  return fetch("/api/letters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(letter),
  }).then(r => r.json());
}

export default function CompanyLetterHead() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [letter, setLetter] = useState<Letter>(initialLetter);
  const [lastSavedLetter, setLastSavedLetter] = useState<Letter>(initialLetter);
  const [previewMode, setPreviewMode] = useState(false);
  const [editableDraft, setEditableDraft] = useState(draftTemplate4);
  const [selectedLetterIds, setSelectedLetterIds] = useState<number[]>([]);

  useEffect(() => {
    fetchAllLetters().then(setLetters);
  }, []);

  useEffect(() => {
    // Reset editableDraft when form is opened or closed
    if (showForm) {
      setEditableDraft(letter.body || draftTemplate4);
    }
  }, [showForm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const handleDraftChange = (e) => {
    setEditableDraft(e.target.value);
  };

  const handleSave = async () => {
  if (!letter.subject.trim()) return;
  try {
    let result;
    if (letter.id) {
      // Edit mode: update existing letter
      result = await fetch(`/api/letters/${letter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...letter, body: editableDraft }),
      }).then(r => r.json());
    } else {
      // Create mode: new letter
      result = await saveLetter({ ...letter, body: editableDraft });
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

  const insertTableAtCursor = () => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = editableDraft;
    const newValue = value.substring(0, start) + sampleTable.trim() + value.substring(end);
    setEditableDraft(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + sampleTable.trim().length;
    }, 0);
  };

  const handleSelectLetter = (id) => {
    setSelectedLetterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLetterIds(letters.map((l) => l.id));
    } else {
      setSelectedLetterIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedLetterIds.length) return;
    if (!window.confirm('Delete selected letters?')) return;
    for (const id of selectedLetterIds) {
      await fetch(`/api/letters/${id}`, { method: 'DELETE' });
    }
    setSelectedLetterIds([]);
    fetchAllLetters().then(setLetters);
  };

  if (!showForm) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Company Letters</h2>
          <div>
            <button onClick={() => { setLetter({ ...initialLetter, body: draftTemplate4 }); setShowForm(true); }} style={{ fontSize: 16, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer', marginRight: 12 }}>Create New Letter</button>
            <button onClick={handleDeleteSelected} disabled={!selectedLetterIds.length} style={{ fontSize: 16, background: selectedLetterIds.length ? '#e53e3e' : '#ccc', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: selectedLetterIds.length ? 'pointer' : 'not-allowed' }}>Delete Selected</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #888' }} border={1}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ border: '1px solid #888' }}><input type="checkbox" onChange={handleSelectAll} checked={selectedLetterIds.length === letters.length && letters.length > 0} /></th>
              <th style={{ border: '1px solid #888' }}>Date</th>
              <th style={{ border: '1px solid #888' }}>To</th>
              <th style={{ border: '1px solid #888' }}>Subject</th>
              <th style={{ border: '1px solid #888' }}>Body</th>
              <th style={{ border: '1px solid #888' }}>Preview</th>
            </tr>
          </thead>
          <tbody>
            {letters.map(l => (
              <tr key={l.id}>
                <td style={{ border: '1px solid #888' }}><input type="checkbox" checked={selectedLetterIds.includes(l.id)} onChange={() => handleSelectLetter(l.id)} /></td>
                <td style={{ fontSize: 13, maxWidth: 100, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.date}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.to}</td>
                <td style={{ fontSize: 13, maxWidth: 120, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.subject}</td>
                <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888' }}>{l.body.length > 120 ? l.body.slice(0, 120) + '...' : l.body}</td>
                <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: '1px solid #888', textAlign: 'center', verticalAlign: 'middle' }}><button onClick={() => { setLetter(l); setPreviewMode(true); setShowForm(true); }}>Preview</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (previewMode) {
    const handleDownloadPDF = async () => {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 40;
      // Add watermark (centered, faded)
      const watermarkImg = '/lovable-uploads/watermark.jpeg';
      const logoImg = '/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png';
      // Load images as base64
      const getBase64FromUrl = async (url) => {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => resolve(reader.result);
        });
      };
      // Logo (top left)
      const logoBase64 = await getBase64FromUrl(logoImg) as string;
      doc.addImage(logoBase64, 'PNG', margin, y, 60, 60);
      // Watermark (center, faded)
      const watermarkBase64 = await getBase64FromUrl(watermarkImg) as string;
      doc.addImage(watermarkBase64, 'JPEG', pageWidth/2-120, 250, 240, 240, undefined, 'NONE', 0.03);
      // Heading text
      doc.setFont('Times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#2366a8');
      doc.text('VESHAD AND COMPANY', margin+70, y+20);
      doc.setFont('Times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor('#2366a8');
      doc.text('# 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE, BANGALORE - 560008, KARNATAKA, INDIA', margin+70, y+38)
      doc.text('Landline:- (91) - 80 - 35550915,  Mobile :- 8317368522 / 9611355110', margin+70, y+48);
      doc.text('Email:- admin@veshad.com / veshad.blr@gmail.com', margin+70, y+58);
      // Blue line
      doc.setDrawColor('#2366a8');
      doc.setLineWidth(2);
      doc.line(margin, y+70, pageWidth-margin, y+70);
      y += 130;
      doc.setTextColor('#000');
      doc.setFont('Times', 'normal');
      doc.setFontSize(12);
      // Date
      doc.text(`Date: ${letter.date}`, margin, y);
      y += 20;
      // To
      doc.text('To:', margin, y);
      y += 15;
      const toLines = doc.splitTextToSize(letter.to || '', pageWidth - margin*2 - 20);
      doc.text(toLines, margin+20, y);
      y += toLines.length * 15 + 10;
      // From
      doc.text('From:', margin, y);
      y += 15;
      const fromLines = doc.splitTextToSize(draftTemplate2, pageWidth - margin*2 - 20);
      doc.text(fromLines, margin+20, y);
      y += fromLines.length * 10 + 10;
      // draftTemplate3
      const draft3Lines = doc.splitTextToSize(draftTemplate3, pageWidth - margin*2);
      doc.text(draft3Lines, margin, y);
      y += draft3Lines.length * 15 + 5;
      // Subject
      doc.setFont('Times', 'bold');
      doc.text('Subject:', margin+20, y);
      doc.setFont('Times', 'normal');
      doc.text(letter.subject, margin+70, y);
      y += 20;
      // Body
      const bodyLines = doc.splitTextToSize(letter.body || '', pageWidth - margin*2);
      for (let i = 0; i < bodyLines.length; i++) {
        doc.text(bodyLines[i], margin, y);
        y += 16;
        if (i < bodyLines.length - 1 && y > 780) { doc.addPage(); y = 40;
          // Add watermark to new page as well
          doc.addImage(watermarkBase64, 'JPEG', pageWidth/2-120, 250, 240, 240, undefined, 'NONE', 0.03);
        }
      }
      doc.save(`Veshad_Letter_${letter.date}.pdf`);
    };

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
        <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>Date:</span> <span>{letter.date}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>To:</span><br />
            <div style={{ whiteSpace: 'pre-line', marginLeft: 8 }}>{letter.to}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>From:</span><br />
            <div style={{ whiteSpace: 'pre-line', marginLeft: 8 }}>{draftTemplate2}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-line' }}>{draftTemplate3}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>Subject:</span> <span style={{ marginLeft: 8 }}>{letter.subject}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ whiteSpace: 'pre-wrap', marginLeft: 8 }}>{letter.body}</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={() => {
                setEditableDraft(letter.body || draftTemplate4);
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
      <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Date: <input name="date" type="date" value={letter.date} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>To :<br />
            <textarea name="to" value={letter.to || ""} onChange={handleChange} style={{ width: 500, height: 60,  border: '1px solid #ccc', fontSize: 16, marginLeft: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>From :</label><br />
          <textarea
            value={draftTemplate2}
            readOnly
            style={{ width: 500, height: 100, fontSize: 16, marginLeft: 8, whiteSpace: 'pre-line', border: '1px solid #ccc', borderRadius: 4, overflowX: 'hidden', resize: 'none' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>{draftTemplate3}</label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Subject: <input name="subject" value={letter.subject} onChange={handleChange} style={{ width: 500, fontSize: 16,  border: '1px solid #ccc', marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Body:</label><br />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <textarea
              id="body-textarea"
              name="body"
              value={editableDraft}
              onChange={handleDraftChange}
              style={{ width: '100%', height: 300, fontSize: 16, border: '1px solid #ccc', marginTop: 8 }}
            />
            <button type="button" onClick={insertTableAtCursor} style={{ height: 40, fontSize: 14, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '0 16px', cursor: 'pointer' }}>Insert Table</button>
          </div>
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
