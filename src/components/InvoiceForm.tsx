import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Invoice, InvoiceItem } from "@/types/invoice";
import { saveInvoice, generateInvoiceNumber } from "@/utils/invoiceStorage";
import { numberToWords } from "@/utils/numberToWords";
import { useToast } from "@/hooks/use-toast";

// Utility for localStorage delivery addresses
const DELIVERY_ADDRESSES_KEY = "veshad_delivery_addresses";
function getSavedDeliveryAddresses() {
  const stored = localStorage.getItem(DELIVERY_ADDRESSES_KEY);
  return stored ? JSON.parse(stored) : [];
}
function saveDeliveryAddress(address) {
  const addresses = getSavedDeliveryAddresses();
  // Avoid duplicates by name+address
  if (!addresses.some(a => a.name === address.name && a.address === address.address)) {
    addresses.push(address);
    localStorage.setItem(DELIVERY_ADDRESSES_KEY, JSON.stringify(addresses));
  }
}

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}

export const InvoiceForm = ({ invoice, onSave }: InvoiceFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for form data
  const [formData, setFormData] = useState<Invoice | null>(null);

  // Fetch invoice number if creating new
  useEffect(() => {
  async function initForm() {
    if (invoice) {
      // Editing mode: use the invoice prop directly
      setFormData(invoice);
      setLoading(false);
      return;
    }

    // Creating mode: generate a new invoice number
    const invoiceNumber = await generateInvoiceNumber();
    setFormData({
      id: Date.now().toString(),
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      revision: 1,
      gst: "29DXRPS1061JLZS",
      supplier: {
        name: "2876,1st Main Kodihalli",
        address: "HAL 2nd Stage",
        city: "Bangalore",
        state: "Karnataka",
        country: "INDIA",
        postalCode: "560008",
        phone: "+91-8317368522",
        email: "veshad.blr@gmail.com"
      },
      deliveryAddress_name: "",
      deliveryAddress_address: "",
      deliveryAddress_city: "",
      deliveryAddress_postalCode: "",
      deliveryAddress_state: "",
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryChallanRef: "",
      ewayBillRef: "",
      hsnSac: "",
      poRefNo: "",
      items: [{
        id: 1,
        item_description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0
      }],
      totalNet: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      manualEntryLabel: "Manual Entry",
      manualEntryAmount: 0,
      manualEntrySign: 1, // 1 for +, -1 for -
      grandTotal: 0,
      amountInWords: "",
      paymentReceived: 0,
      balanceDue: 0,
      paymentStatus: "Pending",
      termsAndConditions: `1. Any discrepancy in above confirmation must be communicated within 3 days.\nFailing which material dispatched as per O.C.\n2. GST shall be charged as applicable at the time of dispatch.\n3. This order confirmation is valid till 60 days after the delivery schedule.\n4. All the instruments supplied by us carry guarantee for their specified material, components and there is no life guarantee, as the life is depends on process parameters and application.`,
      consignee: "M/s. VESHAD & COMPANY",
      destination: "BANGALORE, Karnataka",
      deliverySchedule: "BEFORE 30.05.2025",
      pf: "INCLUSIVE",
      freight: "EX-WORKS",
      modeOfDespatch: "By Road",
      paymentTerms: "100% DIRECT WITHIN 15 DAYS",
    });
    setLoading(false);
  }

  initForm();
  setSavedAddresses(getSavedDeliveryAddresses());
}, [invoice]);


  // Calculate totals whenever items or deliveryAddress_state change
  useEffect(() => {
    if (!formData) return;
    // Ensure all calculations maintain two decimal places
    const totalNet = parseFloat(formData.items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
    let cgst = 0, sgst = 0, igst = 0, grandTotal = 0;
    let gstTotal = 0;
    if (formData.deliveryAddress_state.trim().toLowerCase() === "karnataka") {
      cgst = parseFloat((totalNet * 0.09).toFixed(2));
      sgst = parseFloat((totalNet * 0.09).toFixed(2));
      igst = 0;
      gstTotal = cgst + sgst;
    } else {
      cgst = 0;
      sgst = 0;
      igst = parseFloat((totalNet * 0.18).toFixed(2));
      gstTotal = igst;
    }
    // Manual entry (after GST, before Grand Total)
    const manual = (formData.manualEntryAmount || 0) * (formData.manualEntrySign || 1);
    grandTotal = parseFloat((totalNet + gstTotal + manual).toFixed(2));
    setFormData(prev => prev && ({
      ...prev,
      totalNet,
      cgst,
      sgst,
      igst,
      grandTotal,
      amountInWords: numberToWords(grandTotal)
    }));
  }, [formData]);

  if (loading || !formData) {
    return <div className="p-6">Loading...</div>;
  }

  const handleInputChange = (field: string, value: string, section?: string) => {
    if (section) {
      setFormData(prev => prev && ({
        ...prev,
        [section]: {
          ...(prev[section as keyof Invoice] as Record<string, string | number>),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => prev && ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!formData) return;
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    // Recalculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      // Format to two decimal places
      const total = newItems[index].quantity * newItems[index].unitPrice;
      newItems[index].total = parseFloat(total.toFixed(2));
    }

    setFormData(prev => prev && ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      item_description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };

    setFormData(prev => prev && ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => prev && ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Basic validation
    if (!formData.deliveryAddress_name || !formData.items.some(item => item.item_description)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    // Add payment info and status to invoice
    const paymentReceived = formData.paymentReceived;
    const grandTotal = parseFloat(formData.grandTotal.toFixed(2));
    const balanceDue = grandTotal - paymentReceived;
    const balanceDueFormatted = parseFloat(balanceDue.toFixed(2));
    const paymentStatus: 'Paid' | 'Pending' = balanceDue <= 0 ? 'Paid' : 'Pending';
    
    const payload = {
      invoiceNumber: formData.invoiceNumber,
      date: formData.date,
      revision: formData.revision,
      deliveryAddress_name: formData.deliveryAddress_name,
      deliveryAddress_address: formData.deliveryAddress_address,
      deliveryAddress_city: formData.deliveryAddress_city,
      deliveryAddress_postalCode: formData.deliveryAddress_postalCode,
      deliveryAddress_state: formData.deliveryAddress_state,
      deliveryDate: formData.deliveryDate,
      deliveryChallanRef: formData.deliveryChallanRef,
      ewayBillRef: formData.ewayBillRef || '', // Added for Eway Bill No
      hsnSac: formData.hsnSac,
      poRefNo: formData.poRefNo,
      invoiceTotal: grandTotal,
      totalNet: parseFloat(formData.totalNet.toFixed(2)),
      cgst: parseFloat(formData.cgst.toFixed(2)),
      sgst: parseFloat(formData.sgst.toFixed(2)),
      igst: parseFloat(formData.igst.toFixed(2)),
      grandTotal: grandTotal,
      amountInWords: formData.amountInWords,
      paymentReceived: paymentReceived,
      paymentBank: formData.paymentBank || '', // Added
      paymentBankRef: formData.paymentBankRef || '', // Added
      paymentDate: formData.paymentDate || '', // Added
      balanceDue: balanceDueFormatted,
      paymentStatus: paymentStatus,
      items: formData.items.map(item => ({
        item_description: item.item_description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toFixed(2)),
        total: parseFloat(item.total.toFixed(2))
      }))
    };

    const isEditing = !!invoice;
    const url = isEditing
      ? `http://localhost:4000/api/invoices/${encodeURIComponent(formData.invoiceNumber)}`
      : "http://localhost:4000/api/invoices";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch((err) => {
        throw new Error("Network error: " + err.message);
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error("Server error: " + response.statusText);
        }
        throw new Error(errorData.error || "Unknown error");
      }

      toast({
        title: "Success",
        description: `Invoice ${formData.invoiceNumber} has been saved successfully.`,
      });

      if (onSave) {
        // Call the onSave callback with the full invoice object
        onSave(formData);
        saveDeliveryAddress({
          name: formData.deliveryAddress_name,
          address: formData.deliveryAddress_address,
          city: formData.deliveryAddress_city,
          state: formData.deliveryAddress_state,
          postalCode: formData.deliveryAddress_postalCode,
        });
        navigate(`/invoices/view/${encodeURIComponent(formData.invoiceNumber)}`);
      }
      else {
        saveInvoice(formData);
        navigate('/invoices');
      }

    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save invoice.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handler for DC button: save invoice, then go to Delivery Challan
  const handleSaveAndGoToDC = async () => {
    if (!formData) return;
    // Basic validation (reuse from handleSubmit)
    if (!formData.deliveryAddress_name || !formData.items.some(item => item.item_description)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    // Prepare payload (reuse from handleSubmit)
    const paymentReceived = formData.paymentReceived;
    const grandTotal = parseFloat(formData.grandTotal.toFixed(2));
    const balanceDue = grandTotal - paymentReceived;
    const balanceDueFormatted = parseFloat(balanceDue.toFixed(2));
    const paymentStatus: 'Paid' | 'Pending' = balanceDue <= 0 ? 'Paid' : 'Pending';
    const payload = {
      ...formData,
      invoiceTotal: grandTotal,
      totalNet: parseFloat(formData.totalNet.toFixed(2)),
      cgst: parseFloat(formData.cgst.toFixed(2)),
      sgst: parseFloat(formData.sgst.toFixed(2)),
      igst: parseFloat(formData.igst.toFixed(2)),
      grandTotal: grandTotal,
      amountInWords: formData.amountInWords,
      paymentReceived: paymentReceived,
      paymentBank: formData.paymentBank || '',
      paymentBankRef: formData.paymentBankRef || '',
      paymentDate: formData.paymentDate || '',
      balanceDue: balanceDueFormatted,
      paymentStatus: paymentStatus,
      items: formData.items.map(item => ({
        item_description: item.item_description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toFixed(2)),
        total: parseFloat(item.total.toFixed(2))
      }))
    };
    // Save invoice
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(formData.invoiceNumber)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save invoice");
      toast({ title: "Invoice Saved", description: "Invoice saved successfully!", variant: "default" });
      navigate('/delivery-challan');
    } catch (err) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    }
  };

  // Move these helper functions outside handleSubmit
  function formatDateToDDMMYYYY(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  function formatDateToDDMMMMYYYY(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'long' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
              required
              readOnly // Prevent user from editing the auto-generated number
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {formatDateToDDMMYYYY(formData.date)}
            </div>
          </div>
          <div>
            <Label htmlFor="revision">Revision</Label>
            <Input
              id="revision"
              value={formData.revision}
              onChange={(e) => handleInputChange('revision', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="deliveryName">Name/Organization</Label>
            <select
              id="deliveryName"
              className="border rounded px-2 py-1 w-full mb-1"
              value={formData.deliveryAddress_name}
              onChange={e => {
                const selected = savedAddresses.find((a) => a.name === e.target.value);
                if (selected) {
                  setFormData(prev => prev && ({
                    ...prev,
                    deliveryAddress_name: selected.name,
                    deliveryAddress_address: selected.address,
                    deliveryAddress_city: selected.city,
                    deliveryAddress_state: selected.state,
                    deliveryAddress_postalCode: selected.postalCode
                  }));
                } else {
                  setFormData(prev => prev && ({
                    ...prev,
                    deliveryAddress_name: e.target.value
                  }));
                }
              }}
            >
              <option value="">-- Select or enter new --</option>
              {savedAddresses.map((address, idx) => (
                <option key={idx} value={address.name}>{address.name}</option>
              ))}
            </select>
            <Input
              id="deliveryNameInput"
              placeholder="Enter new name/organization"
              value={formData.deliveryAddress_name}
              onChange={e => setFormData(prev => prev && ({ ...prev, deliveryAddress_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="deliveryCity">City</Label>
            <Input
              id="deliveryCity"
              value={formData.deliveryAddress_city}
              onChange={(e) => setFormData(prev => prev && ({ ...prev, deliveryAddress_city: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="deliveryState">State</Label>
            <Input
              id="deliveryState"
              value={formData.deliveryAddress_state}
              onChange={(e) => setFormData(prev => prev && ({ ...prev, deliveryAddress_state: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="deliveryAddress">Address</Label>
            <Textarea
              id="deliveryAddress"
              value={formData.deliveryAddress_address}
              onChange={(e) => setFormData(prev => prev && ({ ...prev, deliveryAddress_address: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="deliveryPostalCode">Postal Code</Label>
            <Input
              id="deliveryPostalCode"
              value={formData.deliveryAddress_postalCode}
              onChange={(e) => setFormData(prev => prev && ({ ...prev, deliveryAddress_postalCode: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formatDateToDDMMMMYYYY(formData.deliveryDate)}
            </div>
          </div>
          <div>
            <Label htmlFor="deliveryChallanRef">Delivery Challan Ref</Label>
            <Input
              id="deliveryChallanRef"
              value={formData.deliveryChallanRef}
              onChange={(e) => handleInputChange('deliveryChallanRef', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ewayBillRef">Eway Bill No</Label>
            <Input
              id="ewayBillRef"
              value={formData.ewayBillRef || ''}
              onChange={(e) => handleInputChange('ewayBillRef', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hsnSac">HSN/SAC</Label>
            <Input
              id="hsnSac"
              value={formData.hsnSac}
              onChange={(e) => handleInputChange('hsnSac', e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="poRefNo">PO Ref No</Label>
            <Textarea
              id="poRefNo"
              value={formData.poRefNo}
              onChange={(e) => handleInputChange('poRefNo', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button type="button" onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {/* Column Headers - Centered */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-3 px-4 text-center font-bold text-gray-700">
            <div className="md:col-span-3 flex justify-center items-center">
              Description
            </div>
            <div className="flex justify-center items-center">
              Quantity
            </div>
            <div className="flex justify-center items-center">
              Unit Price (₹)
            </div>
            <div className="flex justify-center items-center">
              Total
            </div>
          </div>
          
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                <div className="md:col-span-3">
                  <Textarea
                    id={`description-${index}`}
                    value={item.item_description}
                    onChange={(e) => handleItemChange(index, 'item_description', e.target.value)}
                    rows={2}
                    placeholder="Enter item description"
                  />
                </div>
                <div>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                    className="text-center"
                  />
                </div>
                <div>
                  <Input
                    id={`unitPrice-${index}`}
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <div className="h-10 flex items-center justify-center px-3 border rounded-md bg-gray-50">
                      ₹{item.total.toFixed(2)}
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details (Enhanced) */}
      <Card className="border-blue-200 shadow-md bg-blue-50">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="text-xl">Payment Information</CardTitle>
        </CardHeader>
        {/* Compact 2-row layout for payment info */}
        <CardContent className="grid grid-cols-1 gap-2 p-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <Label htmlFor="paymentReceived" className="text-xs font-semibold mb-1 block">Payment Received (₹)</Label>
              <Input id="paymentReceived" type="number" min={0} step="0.01" value={formData.paymentReceived} className="text-sm border" onChange={e => { let value = parseFloat(e.target.value) || 0; const balanceDue = formData.grandTotal - value; setFormData(prev => prev && ({ ...prev, paymentReceived: value, balanceDue: balanceDue, paymentStatus: value >= formData.grandTotal ? 'Paid' : 'Pending', })); }} />
            </div>
            <div className="flex-1">
              <Label htmlFor="balanceDue" className="text-xs font-semibold mb-1 block">Balance Due (₹)</Label>
              <Input id="balanceDue" type="number" value={(formData.grandTotal - formData.paymentReceived).toFixed(2)} readOnly className="text-sm border bg-gray-100" />
            </div>
            <div className="flex-1">
              <Label htmlFor="paymentBank" className="text-xs font-semibold mb-1 block">Payment Bank</Label>
              <Input id="paymentBank" type="text" value={formData.paymentBank || ''} className="text-sm border" onChange={e => setFormData(prev => prev && ({ ...prev, paymentBank: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Label htmlFor="paymentBankRef" className="text-xs font-semibold mb-1 block">Bank Ref ID</Label>
              <Input id="paymentBankRef" type="text" value={formData.paymentBankRef || ''} className="text-sm border" onChange={e => setFormData(prev => prev && ({ ...prev, paymentBankRef: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-1">
            <div className="flex-1">
              <Label htmlFor="paymentDate" className="text-xs font-semibold mb-1 block">Payment Received Date</Label>
              <Input id="paymentDate" type="date" value={formData.paymentDate || ''} className="text-sm border" onChange={e => setFormData(prev => prev && ({ ...prev, paymentDate: e.target.value }))} />
            </div>
            <div className="flex-1 flex items-end">
              <span className={`text-xs font-medium px-2 py-1 rounded ${formData.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{formData.paymentStatus}</span>
              {formData.paymentStatus === 'Paid' && (
                <span className="ml-2 text-red-600 font-bold text-xs uppercase tracking-wider">Payment Recvd</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Totals Summary with Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total Net</p>
              <p className="text-lg font-bold">₹{formData.totalNet.toFixed(2)}</p>
            </div>
            {formData.deliveryAddress_state.trim().toLowerCase() === "karnataka" ? (
              <>
                <div>
                  <p className="text-sm text-gray-500">CGST (9%)</p>
                  <p className="text-lg font-bold">₹{formData.cgst.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SGST (9%)</p>
                  <p className="text-lg font-bold">₹{formData.sgst.toFixed(2)}</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-500">IGST (18%)</p>
                <p className="text-lg font-bold">₹{formData.igst.toFixed(2)}</p>
              </div>
            )}
            {/* Manual Entry Line */}
            <div className="col-span-2 md:col-span-4 flex flex-col items-center mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.manualEntryLabel || "Manual Entry"}
                  onChange={e => setFormData(prev => prev && ({ ...prev, manualEntryLabel: e.target.value }))}
                  className="border rounded px-2 py-1 w-32 text-sm"
                  placeholder="Manual Entry"
                />
                <select
                  value={formData.manualEntrySign || 1}
                  onChange={e => setFormData(prev => prev && ({ ...prev, manualEntrySign: parseInt(e.target.value) }))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={1}>+</option>
                  <option value={-1}>-</option>
                </select>
                <input
                  type="number"
                  value={formData.manualEntryAmount || 0}
                  onChange={e => setFormData(prev => prev && ({ ...prev, manualEntryAmount: parseFloat(e.target.value) || 0 }))}
                  className="border rounded px-2 py-1 w-24 text-sm text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <span className="text-xs text-gray-500 mt-1">(Included in Grand Total, not in GST)</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Grand Total</p>
              <p className="text-xl font-bold text-blue-900">₹{formData.grandTotal.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Amount in Words:</p>
            <p className="font-medium">{formData.amountInWords}</p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          Save Invoice
        </Button>
        <Button type="button" className="bg-green-600 hover:bg-green-700 ml-2" onClick={handleSaveAndGoToDC}>
          DC
        </Button>
      </div>
    </form>
  );
};

export default InvoiceForm;