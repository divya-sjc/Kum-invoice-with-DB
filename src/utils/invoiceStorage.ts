import { Invoice } from "@/types/invoice";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "veshad_invoices";

export const getInvoices = (): Invoice[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveInvoice = (invoice: Invoice): void => {
  const invoices = getInvoices();
  const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
  
  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.push(invoice);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

export const handleDelete = async (invoiceNumber: string) => {
  if (window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
    try {
      // You need to implement DELETE /api/invoices/:invoiceNumber in your backend
      const res = await fetch(`http://localhost:4000/api/invoices/${invoiceNumber}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete invoice");
      }

      // Refresh invoices
      // Optionally, update localStorage or handle updatedInvoices as needed
      const updatedRes = await fetch("http://localhost:4000/api/invoices");
      const updatedInvoices = await updatedRes.json();
      // Example: localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));

      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoiceNumber} has been deleted successfully.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not delete invoice.",
      });
    }
  }
};


export const getInvoiceById = (id: string): Invoice | null => {
  const invoices = getInvoices();
  return invoices.find(inv => inv.id === id) || null;
};



function toast(arg0: { title: string; description: string; }) {
  throw new Error("Function not implemented.");
}

export const generateInvoiceNumber = async (): Promise<string> => {
  try {
    const response = await fetch("http://localhost:4000/api/invoices/next-number");
    if (!response.ok) {
      throw new Error(`Failed to get invoice number: ${response.status}`);
    }
    const data = await response.json();
    return data.invoiceNumber;
  } catch (err) {
    console.error("Invoice number fetch error:", err);
    return "VES/ERR/1001";
  }
}

