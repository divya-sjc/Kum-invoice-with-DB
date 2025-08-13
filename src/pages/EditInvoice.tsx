import { SidebarTrigger } from "@/components/ui/sidebar";
import { Invoice } from "@/types/invoice";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const updateInvoiceInDatabase = async (updatedInvoice: Invoice) => {
  const response = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(updatedInvoice.invoiceNumber)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedInvoice),
  });
  if (!response.ok) {
    console.error("Failed to update invoice");
  }
};

const EditInvoice = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const location = useLocation();
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>(null);
  const [loading, setLoading] = useState(true);
  const [vendorName, setVendorName] = useState("");

  // Refetch invoice when invoiceNumber or location changes (e.g., after modal save)
  useEffect(() => {
    if (!invoiceNumber) return;
    setLoading(true);
    fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(invoiceNumber)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) { setCurrentInvoice(null); setLoading(false); return; }
        // Defensive: ensure all required fields exist
        setCurrentInvoice({
          id: data.id || Date.now().toString(),
          invoiceNumber: data.invoiceNumber || '',
          date: data.date || new Date().toISOString().split('T')[0],
          revision: typeof data.revision === 'number' ? data.revision : 1,
          gst: data.gst || '29DXRPS1061J1ZS',
          supplier: data.supplier || {
            name: '', address: '', city: '', state: '', country: '', postalCode: '', phone: '', email: ''
          },
          deliveryAddress_name: data.deliveryAddress_name || '',
          deliveryAddress_address: data.deliveryAddress_address || '',
          deliveryAddress_city: data.deliveryAddress_city || '',
          deliveryAddress_postalCode: data.deliveryAddress_postalCode || '',
          deliveryAddress_state: data.deliveryAddress_state || '',
          deliveryDate: data.deliveryDate || new Date().toISOString().split('T')[0],
          deliveryChallanRef: data.deliveryChallanRef || '',
          hsnSac: data.hsnSac || '',
          poRefNo: data.poRefNo || '',
          paymentReceived: typeof data.paymentReceived === 'number' ? data.paymentReceived : 0,
          balanceDue: data.balanceDue || 0,
          totalNet: data.totalNet || 0,
          grandTotal: data.grandTotal || 0,
          amountInWords: data.amountInWords || '',
          paymentStatus: data.paymentStatus || 'Pending',
          paymentBank: data.paymentBank || '',
          paymentBankRef: data.paymentBankRef || '',
          paymentDate: data.paymentDate || '',
          ewayBillRef: data.ewayBillRef || '',
          items: Array.isArray(data.items) && data.items.length > 0 ? data.items : [{ id: 1, item_description: '', quantity: 1, unitPrice: 0, total: 0 }],
          veshadCgst: data.veshadCgst || 0,
          veshadSgst: data.veshadSgst || 0,
          veshadIgst: data.veshadIgst || 0,
          notes: typeof data.miscNotes === 'string' ? data.miscNotes : '',
          vendor_id: data.vendor_id || null,
          profitPercent: typeof data.profitPercent === 'number' ? data.profitPercent : 0,
        });
        setLoading(false);
        // Fetch vendor name if vendor_id exists
        if (data.vendor_id) {
          fetch(`http://localhost:4000/api/vendor-names/by-id?id=${data.vendor_id}`)
            .then(res => res.ok ? res.json() : null)
            .then(vendor => {
              if (vendor && vendor.vendorName) setVendorName(vendor.vendorName);
            });
        }
      });
  }, [invoiceNumber, location]);

  if (loading) return <div>Loading...</div>;
  if (!currentInvoice) return <Navigate to="/invoices" replace />;

  const handleInvoiceUpdate = (updatedInvoice: Invoice) => {
    setCurrentInvoice(updatedInvoice);
    updateInvoiceInDatabase(updatedInvoice);
  };

  function handleUpdateInvoice(updatedInvoice: Invoice): void {
    // Always update with the full invoice object, including items
    setCurrentInvoice(updatedInvoice);
    updateInvoiceInDatabase(updatedInvoice);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-gray-900">Edit Invoice</h1>
      </div>
      {/* <InvoiceForm invoice={currentInvoice} onSave={handleUpdateInvoice} /> */}
      <InvoiceForm invoice={currentInvoice} vendorName={vendorName} onSave={handleUpdateInvoice} />
    </div>
  );
};

export default EditInvoice;
