import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { InvoicePreview } from "@/components/InvoicePreview";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Invoice } from "@/types/invoice";

const ViewInvoice = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const decodedInvoiceNumber = invoiceNumber ? decodeURIComponent(invoiceNumber) : "";
  const navigate = useNavigate();
  const toast = useToast();

  const [invoice, setInvoice] = useState<Invoice>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!decodedInvoiceNumber) return;

    const fetchInvoice = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(decodedInvoiceNumber)}`);
        if (!response.ok) throw new Error("Invoice not found");

        const data = await response.json();
        const formatted = {
          ...data,
          supplier: {
            name: "VESHAD AND COMPANY",
            gst: "29DXRPS1061J1ZS",
            address: "2876,1st Main Kodihalli",
            address2: "HAL 2nd Stage",
            city: "Bangalore",
            state: "Karnataka",
            country: "INDIA",
            postalCode: "560008",
            phone: "+91-8317368522",
            email: "veshad.blr@gmail.com // admin@veshad.com",
          },
          items: data.items ?? [],
        };
        console.log("Loaded invoice:", formatted);
        setInvoice(formatted);
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.toast({
          title: "Error",
          description: "Invoice not found or failed to load.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [decodedInvoiceNumber, toast]);

  const onDelete = async () => {
    if (!invoice) return;

    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        const response = await fetch(`http://localhost:4000/api/invoices/${encodeURIComponent(invoice.invoiceNumber)}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Delete failed");

        toast.toast({
          title: "Invoice Deleted",
          description: `Invoice ${invoice.invoiceNumber} has been deleted successfully.`,
        });
        navigate("/invoices");
      } catch (error) {
        toast.toast({
          title: "Error",
          description: "Failed to delete invoice.",
        });
      }
    }
  };

  if (!invoiceNumber) {
    return <Navigate to="/invoices" replace />;
  }

  if (loading) {
    return <div className="p-6 text-lg text-gray-600">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6 text-lg text-red-600">Invoice not found or failed to load.</div>;
  }

  return (
    <div className="p-6 space-y-6" style={{ position: "relative" }}>
      {/* GST No at the top, thick bold, font size 18 */}
      <div style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontWeight: 'bold', fontSize: 18, letterSpacing: 1, marginBottom: 8 }}>
        GST No: 29DXRPS1061J1ZS
      </div>
      {/* Watermark removed for View Invoice */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-4xl font-bold text-gray-900">
            Invoice {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/invoices/edit/${encodeURIComponent(invoice.invoiceNumber)}`}>
            <Button variant="outline">
              <Edit className="h-5 w-5 mr-2" />
              <span className="text-base">Edit</span>
            </Button>
          </Link>
          {invoice.paymentStatus !== 'Paid' && (
            <Button
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 text-base"
            >
              <Trash2 className="h-5 w-5 mr-1" />
              <span className="text-base">Delete</span>
            </Button>
          )}
        </div>
      </div>
      <InvoicePreview invoice={invoice} hidePaymentInfo />
    </div>
  );
};

export default ViewInvoice;
