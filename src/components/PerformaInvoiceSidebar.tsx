import React from 'react';

const PerformaInvoiceSidebar = () => {
  return (
    <aside className="w-64 bg-gray-100 p-4 border-r">
      <h2 className="text-xl font-bold mb-4">Performa Invoice Sidebar</h2>
      {/* Add sidebar content here */}
      <ul className="space-y-2">
        <li><a href="#" className="text-blue-600 hover:underline">Create Performa Invoice</a></li>
        <li><a href="#" className="text-blue-600 hover:underline">View Invoices</a></li>
        <li><a href="#" className="text-blue-600 hover:underline">Import Invoices</a></li>
      </ul>
    </aside>
  );
};

export default PerformaInvoiceSidebar;
