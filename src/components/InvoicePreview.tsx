import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Invoice } from "@/types/invoice";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import Watermark from "@/components/Watermark";

interface InvoicePreviewProps {
  invoice: Invoice;
  hidePaymentInfo?: boolean;
}

export const InvoicePreview = ({ invoice, hidePaymentInfo }: InvoicePreviewProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const scale = 2; 
      const imgWidth = canvas.width * scale / window.devicePixelRatio;
      const imgHeight = canvas.height * scale / window.devicePixelRatio;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="space-y-4" style={{ position: "relative" }}>
      {/* Only show watermark if not hidePaymentInfo and invoice is paid */}
      {!hidePaymentInfo && invoice.paymentStatus === 'Paid' && (
        <Watermark label="Payment Recvd" color="rgba(34,197,94,0.15)" />
      )}
      <div className="flex justify-end">
        <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 text-base">
          <FileText className="h-5 w-5 mr-2" />
          Download PDF
        </Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <div ref={invoiceRef} className="bg-white p-10" style={{ fontFamily: 'Arial, sans-serif', fontSize: '1.125rem' }}>
          {/* Header */}
          <div className="border-2 border-gray-800">
            <div className="grid grid-cols-3 border-b border-gray-800">
              <div className="border-r border-gray-800 p-6">
                <div className="text-xl font-bold">VESHAD AND COMPANY</div>
                <div style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>
                  GST No: <span style={{ fontWeight: 'bold' }}>29DXRPS1061J1ZS</span>
                </div>
                {/* <div className="text-base">GST: {invoice.gst}</div> */}
                <div className="text-sm mt-2">
                  {invoice.supplier?.name ?? "-"}<br/>
                  {invoice.supplier?.address ?? "-"}<br/>
                  {invoice.supplier?.city ?? "-"}<br/>
                  {invoice.supplier?.country ?? "-"}<br/>
                  {invoice.supplier?.postalCode ?? "-"}<br/>
                  {invoice.supplier?.phone ?? "-"}
                </div>
                <div className="text-sm mt-2">
                  <a href={`mailto:${invoice.supplier.email}`} className="text-blue-600">
                    {invoice.supplier.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center p-4">
                <img 
                  src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" 
                  alt="Veshad and Company Logo" 
                  className="h-44 w-auto"
                />
              </div>
              <div className="p-6">
                <div className="text-right">
                  <div className="text-3xl font-bold">INVOICE</div>
                  <table className="ml-auto mt-2 text-base">
                    <tbody>
                      <tr>
                        <td className="pr-1 align-top">Date</td>
                        <td className="pl-1 align-top">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                      <tr>
                        <td className="pr-1 align-top">Invoice No.</td>
                        <td className="pl-1 align-top">{invoice.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td className="pr-1 align-top">Rev</td>
                        <td className="pl-1 align-top">{invoice.revision}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Supplier and Delivery Address */}
            <div className="grid grid-cols-2">
              <div className="border-r border-gray-800 p-6">
                <div className="font-bold text-xl mb-2">Supplier</div>
                <div className="text-base">
                  {invoice.supplier?.name ?? "-"}<br/>
                  {invoice.supplier?.address ?? "-"}<br/>
                  {invoice.supplier?.city ?? "-"}<br/>
                  {invoice.supplier?.country ?? "-"}<br/>
                  {invoice.supplier?.postalCode ?? "-"}<br/>
                  {invoice.supplier?.phone ?? "-"}<br/>
                  <a href={`mailto:${invoice.supplier?.email}`} className="text-blue-600">
                    {invoice.supplier?.email ?? "-"}
                  </a>
                </div>
              </div>
              <div className="p-6">
                <div className="font-bold text-xl mb-2">Delivery Address</div>
                <div className="text-base">
                  {invoice.deliveryAddress_name}<br/>
                  {invoice.deliveryAddress_address}<br/>
                  {invoice.deliveryAddress_city} - {invoice.deliveryAddress_postalCode}, {invoice.deliveryAddress_state}
                </div>
              </div>
            </div>
            {/* Details Row */}
            <div className="grid grid-cols-5 border-t border-gray-800 text-base">
              <div className="border-r border-gray-800 p-3">
                <div className="font-bold">Delivery Date</div>
                <div>{new Date(invoice.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="border-r border-gray-800 p-3">
                <div className="font-bold">Delivery Challan Ref</div>
                <div>{invoice.deliveryChallanRef}</div>
              </div>
              <div className="border-r border-gray-800 p-3">
                <div className="font-bold">HSN / SAC</div>
                <div>{invoice.hsnSac}</div>
              </div>
              <div className="border-r border-gray-800 p-3">
                <div className="font-bold">PO ref NO</div>
                <div className="text-sm">{invoice.poRefNo}</div>
              </div>
              <div className="p-3">
                <div className="font-bold">Eway Bill Ref</div>
                <div className="text-sm">{invoice.ewayBillRef || '-'}</div>
              </div>
            </div>
            {/* Items Table */}
            <table className="w-full border-t border-gray-800 text-base">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="border-r border-gray-800 p-3 text-left min-w-[2.5rem]">ITEM</th>
                  <th className="border-r border-gray-800 p-3 text-left">DESCRIPTION</th>
                  <th className="border-r border-gray-800 p-3 text-center min-w-[4.5rem] whitespace-nowrap">QTY in PCS</th>
                  <th className="border-r border-gray-800 p-3 text-center min-w-[6rem] whitespace-nowrap">UNIT PRICE</th>
                  <th className="p-3 text-center min-w-[6rem] whitespace-nowrap">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="border-r border-gray-800 p-3 text-center">{index + 1}</td>
                    <td className="border-r border-gray-800 p-3">{item.item_description}</td>
                    <td className="border-r border-gray-800 p-3 text-center whitespace-nowrap">{item.quantity}</td>
                    <td className="border-r border-gray-800 p-3 text-center whitespace-nowrap">₹ {item.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-center whitespace-nowrap">₹ {item.total.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Empty rows for spacing */}
                {Array.from({ length: Math.max(0, 3 - invoice.items.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-800" style={{ height: '40px' }}>
                    <td className="border-r border-gray-800 p-3"></td>
                    <td className="border-r border-gray-800 p-3"></td>
                    <td className="border-r border-gray-800 p-3"></td>
                    <td className="border-r border-gray-800 p-3"></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="grid grid-cols-2">
              {/* Left column: remove In Words block */}
              <div className="border-r border-gray-800 p-6">
                {/* Payment details block only if not hidePaymentInfo */}
                {!hidePaymentInfo && (
                  <div className="mt-4 grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded">
                    <div className="flex flex-wrap gap-4">
                      <div><span className="font-bold">Payment Bank:</span> {invoice.paymentBank || '-'}</div>
                      <div><span className="font-bold">Payment Bank Ref ID:</span> {invoice.paymentBankRef || '-'}</div>
                      <div><span className="font-bold">Payment Status:</span> <span className={invoice.paymentStatus === 'Paid' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>{invoice.paymentStatus}</span></div>
                      <div><span className="font-bold">Payment Received (₹):</span> ₹ {invoice.paymentReceived?.toFixed(2) ?? '0.00'}</div>
                      <div><span className="font-bold">Balance Due:</span> ₹ {invoice.balanceDue?.toFixed(2) ?? '0.00'}</div>
                    </div>
                  </div>
                )}
                <div className="mt-4 text-sm">
                  <div className="font-bold">Declaration:</div>
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                </div>
                {/* Company's Bank Information Block */}
                <div className="mt-6 p-4 border border-gray-400 rounded-lg bg-gray-50">
                  <div className="font-bold text-lg mb-2">Company's Bank Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-base">
                    <div><span className="font-semibold">Bank Name:</span> IDFC First Bank</div>
                    <div><span className="font-semibold">Branch:</span> Jeevanbhima Nagar Branch</div>
                    <div><span className="font-semibold">Account Number:</span> 61517181917</div>
                    <div><span className="font-semibold">MICR Code:</span> 560751024</div>
                    <div><span className="font-semibold">IFSC:</span> IDFB0080184</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <table className="w-full text-base">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="py-2">TOTAL NET</td>
                      <td className="py-2 text-right">₹ {invoice.totalNet.toFixed(2)}</td>
                    </tr>
                    {invoice.deliveryAddress_state?.toLowerCase() === "karnataka" ? (
                      <>
                        <tr className="border-b border-gray-400">
                          <td className="py-2">CGST (9%)</td>
                          <td className="py-2 text-right">₹ {invoice.cgst.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-400">
                          <td className="py-2">SGST (9%)</td>
                          <td className="py-2 text-right">₹ {invoice.sgst.toFixed(2)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr className="border-b border-gray-400">
                        <td className="py-2">IGST (18%)</td>
                        <td className="py-2 text-right">₹ {invoice.igst?.toFixed(2) ?? "0.00"}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-800">
                      <td className="py-3 font-bold">TOTAL</td>
                      <td className="py-3 text-right font-bold">₹ {invoice.grandTotal.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-gray-800">
                      <td className="py-3 font-bold">Grand Total</td>
                      <td className="py-3 text-right font-bold">₹ {invoice.grandTotal.toFixed(2)}</td>
                    </tr>
                    {/* Amount In Words row below Grand Total */}
                    <tr>
                      <td colSpan={2} className="pt-2 text-right italic text-base text-gray-700">
                        Amount In Words: <span className="font-semibold">{invoice.amountInWords}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="flex flex-col items-center justify-end border-2 border-gray-800 rounded-lg min-h-[240px] p-16">
              <div className="flex flex-col items-center w-full justify-end h-full">
                <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 22 }} className="font-bold mb-1">Customer’s Seal and Signature</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-end border-2 border-gray-800 rounded-lg min-h-[300px] p-16 pt-32">
              <div className="flex flex-col items-center w-full justify-end h-full mt-auto">
                <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 22 }} className="font-bold mb-1 mt-8">For Veshad And Company</span>
                <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 22 }} className="font-semibold mb-1">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
