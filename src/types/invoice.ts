export interface InvoiceItem {
  id: number;
  item_description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  revision: number;
  gst: string;
  deliveryAddress_name: string;
  deliveryAddress_address: string;
  deliveryAddress_city: string;
  deliveryAddress_postalCode: string;
  deliveryAddress_state: string;
  deliveryDate: string;
  deliveryChallanRef: string;
  hsnSac: string;
  poRefNo: string;
  paymentReceived: number;
  balanceDue: number;
  totalNet: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus?: 'Paid' | 'Pending';
  paymentBank?: string; // Added
  paymentRecvdDate?: string; // Added
  paymentBankRef?: string; // Added
  paymentDate?: string; // Added for payment date
  ewayBillRef?: string; // Added for Eway Bill Ref
  items: {
    id: number;
    item_description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];  
  supplier: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone: string;
    email: string;
  };
  termsAndConditions?: string;
  consignee?: string;
  destination?: string;
  deliverySchedule?: string;
  pf?: string;
  freight?: string;
  modeOfDespatch?: string;
  paymentTerms?: string;
}
