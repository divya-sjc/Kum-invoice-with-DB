import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Trash2, Upload, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface DashRecord {
  sl_no: number;
  product: string;
  invoice_date: string;
  payment_received_from_client: string;
  client_name: string;
  qty: number;
  bank_ransferred_amount_in_usd: number;
  total_banktransfer_amount_in_inr: number;
  courier: string;
  customs: number;
  misc_charges: number;
  emd_charges: number;
  epbg_charges: number;
  total_landing_cost: number;
  total_landing_cost_per_pc: number;
  igst_from_customs: number;
  total_invoice_amount_without_gst: number;
  selling_price_per_pc: number;
  gst_collected_from_client: number;
  gst_paid_to_vendor: number;
  difference_in_gst_amount: number;
  profit_per_pc: number;
  profit_total: number;
  profit_percent: number;
  payment_recvd_bank: string;
  payment_made_to_vendor: string;
  shipment_arranged_from_vendor: string;
  customs_cleared: string;
  regularization_govt_registration: string;
  products_recveived: string;
  delivery_challan: string;
  invoice_prepared: string;
  shipment_delivered_to_client: string;
  pick_up_no: string;
  boe_no: string;
  awb: string;
}

const Dash: React.FC = () => {
  const [records, setRecords] = useState<DashRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DashRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state for add/edit
  const [formData, setFormData] = useState<Partial<DashRecord>>({});

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dash');
      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/dash/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        toast.success(`Imported ${result.insertedCount} records successfully`);
        fetchRecords();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to import file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(records.map(record => record.sl_no)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (sl_no: number, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(sl_no);
    } else {
      newSelected.delete(sl_no);
    }
    setSelectedRecords(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) {
      toast.error('No records selected');
      return;
    }

    try {
      const response = await fetch('/api/dash/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedRecords) }),
      });

      if (response.ok) {
        toast.success(`Deleted ${selectedRecords.size} records`);
        setSelectedRecords(new Set());
        fetchRecords();
      } else {
        throw new Error('Failed to delete records');
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      toast.error('Failed to delete records');
    }
  };

  const handleEdit = (record: DashRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setFormData({});
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingRecord ? `/api/dash/${editingRecord.sl_no}` : '/api/dash';
      const method = editingRecord ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingRecord ? 'Record updated successfully' : 'Record added successfully');
        setIsEditDialogOpen(false);
        setIsAddDialogOpen(false);
        setEditingRecord(null);
        setFormData({});
        fetchRecords();
      } else {
        throw new Error('Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    }
  };

  const handleInputChange = (field: keyof DashRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const EditForm = () => (
    <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
      {/* Basic Information */}
      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Input
          id="product"
          value={formData.product || ''}
          onChange={(e) => handleInputChange('product', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoice_date">Invoice Date</Label>
        <Input
          id="invoice_date"
          type="date"
          value={formData.invoice_date || ''}
          onChange={(e) => handleInputChange('invoice_date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client_name">Client Name</Label>
        <Input
          id="client_name"
          value={formData.client_name || ''}
          onChange={(e) => handleInputChange('client_name', e.target.value)}
        />
      </div>
      
      {/* Quantity and Amounts */}
      <div className="space-y-2">
        <Label htmlFor="qty">Quantity</Label>
        <Input
          id="qty"
          type="number"
          value={formData.qty || ''}
          onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bank_ransferred_amount_in_usd">Bank Transfer (USD)</Label>
        <Input
          id="bank_ransferred_amount_in_usd"
          type="number"
          step="0.01"
          value={formData.bank_ransferred_amount_in_usd || ''}
          onChange={(e) => handleInputChange('bank_ransferred_amount_in_usd', parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="total_banktransfer_amount_in_inr">Bank Transfer (INR)</Label>
        <Input
          id="total_banktransfer_amount_in_inr"
          type="number"
          step="0.01"
          value={formData.total_banktransfer_amount_in_inr || ''}
          onChange={(e) => handleInputChange('total_banktransfer_amount_in_inr', parseFloat(e.target.value) || 0)}
        />
      </div>
      
      {/* Charges */}
      <div className="space-y-2">
        <Label htmlFor="courier">Courier</Label>
        <Input
          id="courier"
          value={formData.courier || ''}
          onChange={(e) => handleInputChange('courier', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customs">Customs</Label>
        <Input
          id="customs"
          type="number"
          step="0.01"
          value={formData.customs || ''}
          onChange={(e) => handleInputChange('customs', parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="misc_charges">Misc Charges</Label>
        <Input
          id="misc_charges"
          type="number"
          step="0.01"
          value={formData.misc_charges || ''}
          onChange={(e) => handleInputChange('misc_charges', parseFloat(e.target.value) || 0)}
        />
      </div>
      
      {/* Status Fields */}
      <div className="space-y-2">
        <Label htmlFor="payment_recvd_bank">Payment Received Bank</Label>
        <Input
          id="payment_recvd_bank"
          value={formData.payment_recvd_bank || ''}
          onChange={(e) => handleInputChange('payment_recvd_bank', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="products_recveived">Products Received</Label>
        <Input
          id="products_recveived"
          value={formData.products_recveived || ''}
          onChange={(e) => handleInputChange('products_recveived', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="awb">AWB</Label>
        <Input
          id="awb"
          value={formData.awb || ''}
          onChange={(e) => handleInputChange('awb', e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-full" style={{margin: 0, padding: 0}}>
      <Card className="m-0 rounded-none border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Dash Data</span>
            <div className="flex gap-2">
              <Button onClick={handleAdd} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button variant="outline" disabled={isUploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Import File'}
                </Button>
              </div>
              {selectedRecords.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedRecords.size})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-auto w-full border-collapse">
                <TableHeader>
                  <TableRow className="h-auto">
                    <TableHead className="min-w-8 px-1 py-2 text-xs border-r whitespace-normal break-words">
                      <Checkbox
                        checked={selectedRecords.size === records.length && records.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="scale-75"
                      />
                    </TableHead>
                    <TableHead className="min-w-12 px-1 py-2 text-xs border-r whitespace-normal break-words">SL No</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Product</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Invoice Date</TableHead>
                    <TableHead className="min-w-32 px-1 py-2 text-xs border-r whitespace-normal break-words">Payment Received From Client</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Client Name</TableHead>
                    <TableHead className="min-w-12 px-1 py-2 text-xs border-r whitespace-normal break-words">Qty</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Bank Transfer Amount (USD)</TableHead>
                    <TableHead className="min-w-32 px-1 py-2 text-xs border-r whitespace-normal break-words">Total Bank Transfer Amount (INR)</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Courier</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Customs</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Misc Charges</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">EMD Charges</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">EPBG Charges</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Total Landing Cost</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Total Landing Cost Per PC</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">IGST From Customs</TableHead>
                    <TableHead className="min-w-32 px-1 py-2 text-xs border-r whitespace-normal break-words">Total Invoice Amount Without GST</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Selling Price Per PC</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">GST Collected From Client</TableHead>
                    <TableHead className="min-w-26 px-1 py-2 text-xs border-r whitespace-normal break-words">GST Paid To Vendor</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Difference In GST Amount</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Profit Per PC</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Profit Total</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Profit Percent</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Payment Received Bank</TableHead>
                    <TableHead className="min-w-26 px-1 py-2 text-xs border-r whitespace-normal break-words">Payment Made To Vendor</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Shipment Arranged From Vendor</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Customs Cleared</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Regularization Govt Registration</TableHead>
                    <TableHead className="min-w-24 px-1 py-2 text-xs border-r whitespace-normal break-words">Products Received</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Delivery Challan</TableHead>
                    <TableHead className="min-w-20 px-1 py-2 text-xs border-r whitespace-normal break-words">Invoice Prepared</TableHead>
                    <TableHead className="min-w-28 px-1 py-2 text-xs border-r whitespace-normal break-words">Shipment Delivered To Client</TableHead>
                    <TableHead className="min-w-18 px-1 py-2 text-xs border-r whitespace-normal break-words">Pick Up No</TableHead>
                    <TableHead className="min-w-18 px-1 py-2 text-xs border-r whitespace-normal break-words">BOE No</TableHead>
                    <TableHead className="min-w-18 px-1 py-2 text-xs border-r whitespace-normal break-words">AWB</TableHead>
                    <TableHead className="min-w-16 px-1 py-2 text-xs whitespace-normal break-words">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.sl_no} className="hover:bg-muted/50 h-auto">
                      <TableCell className="px-1 py-2 border-r">
                        <Checkbox
                          checked={selectedRecords.has(record.sl_no)}
                          onCheckedChange={(checked) => 
                            handleSelectRecord(record.sl_no, checked as boolean)
                          }
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.sl_no}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.product}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatDate(record.invoice_date)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.payment_received_from_client}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.client_name}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.qty}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">${record.bank_ransferred_amount_in_usd?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.total_banktransfer_amount_in_inr)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.courier}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.customs)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.misc_charges)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.emd_charges)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.epbg_charges)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.total_landing_cost)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.total_landing_cost_per_pc)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.igst_from_customs)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.total_invoice_amount_without_gst)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.selling_price_per_pc)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.gst_collected_from_client)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.gst_paid_to_vendor)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.difference_in_gst_amount)}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{formatCurrency(record.profit_per_pc)}</TableCell>
                      <TableCell className={`px-1 py-2 text-xs border-r whitespace-normal break-words ${record.profit_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(record.profit_total)}
                      </TableCell>
                      <TableCell className={`px-1 py-2 text-xs border-r whitespace-normal break-words ${record.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.profit_percent?.toFixed(2) || '0.00'}%
                      </TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.payment_recvd_bank}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.payment_made_to_vendor}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.shipment_arranged_from_vendor}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.customs_cleared}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.regularization_govt_registration}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.products_recveived}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.delivery_challan}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.invoice_prepared}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.shipment_delivered_to_client}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.pick_up_no}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.boe_no}</TableCell>
                      <TableCell className="px-1 py-2 text-xs border-r whitespace-normal break-words">{record.awb}</TableCell>
                      <TableCell className="px-1 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {records.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No records found. Import a file or add records manually.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Dash Record</DialogTitle>
          </DialogHeader>
          <EditForm />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Add New Dash Record</DialogTitle>
          </DialogHeader>
          <EditForm />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Add Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dash;
