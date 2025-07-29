export interface VendorInvoice {
  id?: number;
  vendorName: string;
  poNumber?: string; // NEW: PO No
  invoiceNumber?: string; // NEW: Invoice No
  itemName: string;
  totalInvoiceValue: number;
  amountWithoutGst?: number; // NEW: Amount without GST
  cgst: number;
  sgst: number;
  igst: number;
  gstCgst?: number; // NEW: GST CGST
  gstSgst?: number; // NEW: GST SGST
  gstIgst?: number; // NEW: GST IGST
  paymentStatus: 'Paid' | 'Pending';
  veshadInvoiceRefNo: string;
  veshadInvoiceValue: number;
  veshadSgst: number;
  veshadCgst: number;
  veshadIgst: number;
  itemReceivedDate?: string; // NEW: Item received date
  paymentMadeDate?: string; // NEW: Payment made date
  profitPercent?: number;
  locked: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function calculateProfitMargin(invoice: Pick<VendorInvoice, 
  'totalInvoiceValue' | 'cgst' | 'sgst' | 'igst' | 
  'veshadInvoiceValue' | 'veshadSgst' | 'veshadCgst' | 'veshadIgst'
>): number {
  const veshadNet = invoice.veshadInvoiceValue - invoice.veshadSgst - invoice.veshadCgst - invoice.veshadIgst;
  const vendorNet = invoice.totalInvoiceValue - invoice.cgst - invoice.sgst - invoice.igst;
  
  if (vendorNet === 0) return 0;
  
  const profitMargin = ((veshadNet - vendorNet) / vendorNet) * 100;
  return Math.round(profitMargin * 100) / 100;
}

export function validateVendorInvoice(invoice: Partial<VendorInvoice>): string[] {
  const errors: string[] = [];

  if (!invoice.vendorName?.trim()) {
    errors.push("Vendor Name is required");
  }

  if (!invoice.itemName?.trim()) {
    errors.push("Item Name is required");
  }

  if (typeof invoice.totalInvoiceValue !== 'number' || invoice.totalInvoiceValue < 0) {
    errors.push("Total Invoice Value must be a positive number");
  }

  if (typeof invoice.cgst !== 'number' || invoice.cgst < 0) {
    errors.push("CGST must be a positive number");
  }

  if (typeof invoice.sgst !== 'number' || invoice.sgst < 0) {
    errors.push("SGST must be a positive number");
  }

  if (typeof invoice.igst !== 'number' || invoice.igst < 0) {
    errors.push("IGST must be a positive number");
  }

  if (!invoice.veshadInvoiceRefNo?.trim()) {
    errors.push("Veshad Invoice Reference No is required");
  }

  if (typeof invoice.veshadInvoiceValue !== 'number' || invoice.veshadInvoiceValue < 0) {
    errors.push("Veshad Invoice Value must be a positive number");
  }

  return errors;
}
