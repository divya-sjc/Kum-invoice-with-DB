import React, { useState, useEffect } from "react";

const initialLetter = {
  date: new Date().toISOString().slice(0, 10),
  body: "",
};

function fetchAllLetterTable() {
  return fetch("/api/letter-table").then(r => r.json());
}

function saveLetterTable(letter) {
  return fetch("/api/letter-table", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(letter),
  }).then(r => r.json());
}

export default function LetterTable() {
  const [letters, setLetters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [letter, setLetter] = useState(initialLetter);

  useEffect(() => {
    fetchAllLetterTable().then(setLetters);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!letter.body) return;
    await saveLetterTable(letter);
    setShowForm(false);
    fetchAllLetterTable().then(setLetters);
  };

  if (!showForm) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>Letter Table</h2>
          <button onClick={() => { setLetter(initialLetter); setShowForm(true); }} style={{ fontSize: 16, background: '#3182ce', color: 'white', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer' }}>Add Letter</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} border={1}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th>Date</th>
              <th>Body</th>
            </tr>
          </thead>
          <tbody>
            {letters.map(l => (
              <tr key={l.id}>
                <td>{l.date}</td>
                <td>{l.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <label>Date: <input name="date" type="date" value={letter.date} onChange={handleChange} style={{ fontSize: 16, marginLeft: 8 }} /></label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Body:</label><br />
        <textarea name="body" value={letter.body} onChange={handleChange} style={{ width: '100%', height: 200, fontSize: 16, marginTop: 8 }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button type="button" onClick={handleSave} style={{ fontSize: 18, background: '#38a169', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer', marginRight: 16 }}>Save</button>
        <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 18, background: '#718096', color: 'white', border: 'none', borderRadius: 4, padding: '8px 32px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}
