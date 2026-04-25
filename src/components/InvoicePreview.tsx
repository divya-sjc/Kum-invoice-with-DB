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
  // ...existing code...
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
          <div className="rounded-lg" style={{ borderColor: '#4472C4', borderStyle: 'solid', borderWidth: '5px' }}>
            <div className="grid grid-cols-3 border-b border-gray-800">
              <div className="border-r border-gray-800 p-6">
                <div className="font-bold" style={{ fontSize: 30, color: '#4472C4', textDecoration: 'underline', textDecorationColor: '#4472C4', textUnderlineOffset: 6 }}>VESHAD AND COMPANY</div>
                <div style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontWeight: 'bold', fontSize: 22, marginTop: 4 }}>
                  GST No: <span style={{ fontWeight: 'bold' }}>29DXRPS1061J1ZS</span>
                </div>
                {/* <div className="text-base">GST: {invoice.gst}</div> */}
                <div className="text-sm mt-2">
                  <span style={{ fontSize: 22 }}>
                    {invoice.supplier?.name ?? "-"}<br/>
                    {invoice.supplier?.address ?? "-"}<br/>
                    {invoice.supplier?.city ?? "-"} - {invoice.supplier?.postalCode ?? "-"}<br/>
                    {invoice.supplier?.country ?? "-"}<br/>
                    {invoice.supplier?.phone ?? "-"}
                  </span>
                </div>
                <div className="text-sm mt-2">
                  <a href={`mailto:${invoice.supplier.email}`} style={{ color: '#4472C4', fontSize: 22 }}>
                    {invoice.supplier.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 border-r border-gray-800">
                <img 
                  src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png" 
                  alt="Veshad and Company Logo" 
                  className="h-44 w-auto"
                />
              </div>
              <div className="p-5 text-left">
                  <div className="text-2xl font-bold">INVOICE</div>
                  <table className="mt-2 text-base">
                    <tbody>
                      <tr>
                          <td className="pr-2 align-top py-4" style={{ fontSize: 24 }}>Date:</td>
                          <td className="pl-3 align-top text-left py-4" style={{ fontSize: 24 }}>
                          {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </td>
                      </tr>
                      <tr>
                          <td className="pr-2 align-top py-4" style={{ fontSize: 24 }}>Invoice No.:</td>
                          <td className="pl-3 align-top text-left py-4" style={{ fontSize: 22 }}>{invoice.invoiceNumber}</td>
                      </tr>
                      <tr>
                          <td className="pr-2 align-top py-4" style={{ fontSize: 24 }}>Rev:</td>
                          <td className="pl-3 align-top text-left py-4" style={{ fontSize: 22 }}>{String(invoice.revision).padStart(2, '0')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
          
          {/* Main invoice content area with border */}
          <div style={{ border: '5px solid #4472C4', borderRadius: '12px', marginTop: 2, marginBottom: 2 }}>
            {/* Supplier and Delivery Address */}
            <div className="grid grid-cols-2">
              <div className="border-r border-gray-800 p-6">
                <div className="font-bold mb-2" style={{ backgroundColor: '#4472C4', color: '#fff', borderRadius: 8, padding: '8px 22px', fontSize: 30, fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif' }}>Supplier</div>
                <div className="text-base" style={{ fontSize: 22 }}>
                  {invoice.supplier?.name ?? "-"}<br/>
                  {invoice.supplier?.address ?? "-"}<br/>
                  {invoice.supplier?.city ?? "-"} - {invoice.supplier?.postalCode ?? "-"}<br/>
                  {invoice.supplier?.country ?? "-"}<br/>
                  {invoice.supplier?.phone ?? "-"}<br/>
                  <a href={`mailto:${invoice.supplier?.email}`} style={{ color: '#4472C4' }}>
                    {invoice.supplier?.email ?? "-"}
                  </a>
                </div>
              </div>
              <div className="p-6">
                <div className="font-bold mb-2" style={{ backgroundColor: '#4472C4', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 30, fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif' }}>Delivery Address</div>
                <div className="text-base" style={{ fontSize: 26 }}>
                  <div style={{ marginBottom: 8 }}>{invoice.deliveryAddress_name}</div>
                  <div style={{ marginBottom: 8 }}>{invoice.deliveryAddress_address}</div>
                  <div>{invoice.deliveryAddress_city} - {invoice.deliveryAddress_postalCode}, {invoice.deliveryAddress_state}</div>
                </div>
              </div>
            </div>
              {/* Details Header Row */}
              <div className="grid grid-cols-5 border-t border-gray-800 text-base items-center" style={{ backgroundColor: '#4472C4', color: '#fff', fontWeight: 'bold' }}>
             <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22 }}>Delivery Date</div>
             <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22 }}>Delivery Challan Ref</div>
             <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22 }}>HSN / SAC</div>
             <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22 }}>PO Ref No</div>
             <div className="p-3 text-left flex items-center justify-center" style={{ fontSize: 22 }}>Eway Bill Ref</div>
              </div>
            {/* Details Row */}
              <div className="grid grid-cols-5 border-t border-gray-800 text-base items-center">
                <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22, height: '100%' }}>
                  {new Date(invoice.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22, height: '100%' }}>
                  {invoice.deliveryChallanRef}
                </div>
                <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22, height: '100%' }}>
                  {invoice.hsnSac}
                </div>
                <div className="border-r border-gray-800 p-3 text-left flex items-center justify-center" style={{ fontSize: 22, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.2, maxWidth: '100%', height: '100%' }}>
                  {invoice.poRefNo}
                </div>
                <div className="p-3 text-left flex items-center justify-center" style={{ fontSize: 22, height: '100%' }}>
                  {invoice.ewayBillRef || '-'}
                </div>
              </div>
            <div className="grid grid-cols-5 border-t border-gray-800 text-base"></div>
            <div><br /></div>
            {/* Items Table */}
            <table className="w-full border-t border-gray-800 text-base">
              <thead>
                <tr className="border-b border-gray-800">
                      <th className="border-r border-gray-800 p-3 text-center min-w-[2.5rem]" style={{ backgroundColor: '#4472C4', color: '#fff', fontSize: 22 }}>ITEM</th>
                      <th className="border-r border-gray-800 p-3 text-left min-w-[32.39rem]" style={{ backgroundColor: '#4472C4', color: '#fff', fontSize: 22 }}>DESCRIPTION</th>
                      <th className="border-r border-gray-800 p-3 text-center w-auto whitespace-nowrap" style={{ backgroundColor: '#4472C4', color: '#fff', fontSize: 22 }}>QTY in PCS</th>
                      <th className="border-r border-gray-800 p-3 text-center w-auto whitespace-nowrap" style={{ backgroundColor: '#4472C4', color: '#fff', fontSize: 22 }}>UNIT PRICE</th>
                      <th className="p-3 text-center w-auto whitespace-nowrap" style={{ backgroundColor: '#4472C4', color: '#fff', fontSize: 22 }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="border-r border-gray-800 p-3 text-center" style={{ fontSize: 22 }}>{index + 1}</td>
                    <td className="border-r border-gray-800 p-3 align-top" style={{ fontSize: 22, wordBreak: 'break-word', whiteSpace: 'pre-line', lineHeight: 1.2, maxWidth: '16.86rem' }}>{item.item_description}</td>
                    <td className="border-r border-gray-800 p-3 text-center whitespace-nowrap" style={{ fontSize: 22 }}>{item.quantity}</td>
                    <td className="border-r border-gray-800 p-3 text-center whitespace-nowrap" style={{ fontSize: 22 }}>₹ {item.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-center whitespace-nowrap" style={{ fontSize: 22 }}>₹ {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-5 border-t border-gray-800 text-base"></div>
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
                  <div className="font-extrabold mb-2" style={{ fontSize: 18, textDecoration: 'underline', textDecorationColor: '#4472C4', textUnderlineOffset: 6 }}>Company's Bank Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-base">
                    <div><span className="font-semibold">Bank Name:</span> IDFC First Bank</div>
                    <div><span className="font-semibold">Branch:</span> Jeevanbhima Nagar Branch</div>
                    <div><span className="font-semibold">Account Number:</span> 61517181917</div>
                    <div><span className="font-semibold">MICR Code:</span> 560751024</div>
                    <div><span className="font-semibold">IFSC:</span> IDFB0080184</div>
                    <div><span className="font-semibold">PAN Card:</span> DXRPS1061J</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <table className="w-full text-base">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="py-2" style={{ fontSize: 22 }}>TOTAL NET</td>
                      <td className="py-2 text-right" style={{ fontSize: 22 }}>₹ {invoice.totalNet.toFixed(2)}</td>
                    </tr>
                    {invoice.deliveryAddress_state?.toLowerCase() === "karnataka" ? (
                      <>
                        <tr className="border-b border-gray-400">
                          <td className="py-2" style={{ fontSize: 22 }}>CGST (9%)</td>
                          <td className="py-2 text-right" style={{ fontSize: 22 }}>₹ {invoice.veshadCgst.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-400">
                          <td className="py-2" style={{ fontSize: 22 }}>SGST (9%)</td>
                          <td className="py-2 text-right" style={{ fontSize: 22 }}>₹ {invoice.veshadSgst.toFixed(2)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr className="border-b border-gray-400">
                        <td className="py-2" style={{ fontSize: 22 }}>IGST (18%)</td>
                        <td className="py-2 text-right" style={{ fontSize: 22 }}>₹ {invoice.veshadIgst?.toFixed(2) ?? "0.00"}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-800">
                        <td className="py-3 font-bold" style={{ fontSize: 22 }}>TOTAL</td>
                        <td className="py-3 text-right font-bold" style={{ fontSize: 22 }}>₹ {invoice.grandTotal.toFixed(2)}</td>
                    </tr>
                    {/* Amount In Words row below Grand Total */}
                    <tr>
                      <td colSpan={2} className="pt-2 text-right italic text-base text-gray-700" style={{ fontSize: 22 }}>
                        Amount In Words: <span className="font-semibold">{invoice.amountInWords}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="pt-1 pl-2 text-right text-base text-gray-700" style={{ fontSize: 20 }}>
                        E.& O.E.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="flex flex-col items-center justify-end border-2 border-gray-800 rounded-lg min-h-[240px] p-22">
              <div className="flex flex-col items-center w-full justify-end h-full">
                <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 22 }} className="font-bold mb-1">Customer’s Seal and Signature</span>
              </div>
            </div>
            <div className="flex flex-col justify-end h-full w-full items-center border-2 border-gray-800 rounded-lg min-h-[300px]">
              <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 24 }} className="font-bold mb-1 mt-8">For Veshad And Company</span>
              <span style={{ fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: 14 }} className="font-semibold mb-1">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
