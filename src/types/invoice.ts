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
  grandTotal: number;
  amountInWords: string;
  paymentStatus?: 'Paid' | 'Pending';
  paymentBank?: string; 
  paymentRecvdDate?: string; 
  paymentBankRef?: string; 
  paymentDate?: string; 
  ewayBillRef?: string; 
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
  veshadCgst: number;
  veshadSgst: number;
  veshadIgst: number;
  notes?: string;
  vendor_id?: number;
  profitPercent?: number;
  manualEntryLabel?: string;
  manualEntryAmount?: number;
  manualEntrySign?: number;
}
