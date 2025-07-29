import { nonFunctionArgSeparator } from "html2canvas/dist/types/css/syntax/parser";
export interface DeliveryItems {
  id: number;
  item_description: string;
  quantity: number;
  Remarks: string;
}

export interface Delivery_Challan { 
  challanNo: string; 
  order_date: string;
  dispatch_date: string;
  bill_to_address: string;
  eway_bill_no: string;
  invoiceNumber: string;
}
