import React from "react";

export default function Sidebar({ children }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: 260, background: '#f8f4f4', borderRight: '10px solid #e5e7eb' }}>
      {children}
    </aside>
  );
}
