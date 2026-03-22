import { SidebarTrigger } from "@/components/ui/sidebar";
import InvoiceForm from "../components/InvoiceForm";
import { useState } from "react";


const CreateInvoice: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'ewaybill'>('invoice');

  // Opens Eway Bill website in Chrome
  const openEwayBillSite = () => {
    window.open('https://ewaybillgst.gov.in/Login.aspx', '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'invoice' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('invoice')}
          >
            Invoice
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'ewaybill' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('ewaybill')}
          >
            Eway Bill
          </button>
        </div>
      </div>
      {activeTab === 'invoice' && (
        <InvoiceForm />
      )}
      {activeTab === 'ewaybill' && (
        <div className="flex flex-col items-center justify-center mt-12">
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded shadow text-lg"
            onClick={openEwayBillSite}
          >
            Open Eway Bill Website
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateInvoice;
