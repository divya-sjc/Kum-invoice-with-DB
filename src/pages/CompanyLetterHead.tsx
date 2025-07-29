import React, { useState, useEffect } from "react";

const initialLetter = {
  subject: "",
  body: "",
  date: new Date().toISOString().slice(0, 10),
};

function fetchAllLetters() {
  return fetch("/api/letters").then(r => r.json());
}

function saveLetter(letter) {
  // Save to backend
  return fetch("/api/letters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(letter),
  }).then(r => r.json());
}

export default function CompanyLetterHead() {
  const [letters, setLetters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [letter, setLetter] = useState(initialLetter);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchAllLetters().then(setLetters);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!letter.subject && !letter.body) return;
    await saveLetter(letter); // Save to backend
    setShowForm(false); // Return to Company Letter page
    setPreviewMode(false);
    fetchAllLetters().then(setLetters); // Refresh list
  };

  if (!showForm) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Company Letters</h2>
          <button onClick={() => { setLetter(initialLetter); setShowForm(true); }} style={{ fontSize: 16, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}>Create New Letter</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} border={1}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th>Date</th>
              <th>Subject</th>
              <th>Body</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {letters.map(l => (
              <tr key={l.id}>
                <td>{l.date}</td>
                <td>{l.subject}</td>
                <td>{l.body.slice(0, 60)}...</td>
                <td><button onClick={() => { setLetter(l); setPreviewMode(true); setShowForm(true); }}>Preview</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (previewMode) {
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
                Landline:- (91) - 80 - 25272041<br />
                Mobile :- (91) 9036644721<br />
                Email:- veshad@outlook.com / veshad.blr@gmail.com
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8 }}>
          <div style={{ marginBottom: 16 }}><b>Date:</b> {letter.date}</div>
          <div style={{ marginBottom: 16 }}><b>Subject:</b> {letter.subject}</div>
          <div style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }}><b>Body:</b><br />{letter.body}</div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button type="button" onClick={() => setPreviewMode(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Edit</button>
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
              # 2876, 1st MAIN KODIHALLI, HAL 2ND STAGE,<br />
              BANGALORE - 560008, KARNATAKA, INDIA<br />
              Landline:- (91) - 80 - 25272041<br />
              Mobile :- (91) 9036644721<br />
              Email:- veshad@outlook.com / veshad.blr@gmail.com
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: 32, borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Date: <input name="date" type="date" value={letter.date} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Subject: <input name="subject" value={letter.subject} onChange={handleChange} style={{ width: 500, fontSize: 16, marginLeft: 8 }} /></label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Body:</label><br />
          <textarea name="body" value={letter.body} onChange={handleChange} style={{ width: '100%', height: 300, fontSize: 16, marginTop: 8 }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" onClick={handleSave} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>Save Letter</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => setPreviewMode(true)} style={{ fontSize: 18, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Preview</button>
        </div>
      </div>
    </div>
  );
}
