import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  reference_number: string;
  vendor: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

interface Purchase {
  id?: number;
  slNo: string;
  date: string;
  description: string;
  credit: number | null;
  debit: number | null;
  bankPaymentRef: string;
  clientName: string;
  paymentRemarks: string;
  refBankName: string;
  invoiceNo: string;
  inputCgst: number | null;
  inputSgst: number | null;
  inputIgst?: number | null;
}

export default function BankTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetch('/api/purchases')
      .then(res => res.json())
      .then(data => setPurchases(Array.isArray(data) ? data : data.data || []))
      .catch(() => toast({ title: 'Error', description: 'Failed to load purchases', variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import transactions');
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: result.message,
      });

      // Refresh the transactions list
      fetchTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Download transactions as Excel
  const downloadAsExcel = () => {
    if (!transactions.length) return;
    const data = transactions.map(t => ({
      Date: t.date,
      Description: t.description,
      Amount: t.amount,
      Type: t.type,
      Status: t.status,
      ReferenceNumber: t.reference_number,
      Vendor: t.vendor,
      PaymentMethod: t.payment_method,
      CreatedAt: t.created_at,
      UpdatedAt: t.updated_at
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BankTransactions');
    XLSX.writeFile(wb, 'bank_transactions.xlsx');
  };

  // Group by bank name and calculate consolidated balance
  const bankMap: Record<string, { credit: number; debit: number }> = {};
  purchases.forEach(p => {
    const bank = p.refBankName || 'Unknown';
    if (!bankMap[bank]) bankMap[bank] = { credit: 0, debit: 0 };
    bankMap[bank].credit += p.credit || 0;
    bankMap[bank].debit += p.debit || 0;
  });
  const bankRows = Object.entries(bankMap).map(([bank, { credit, debit }]) => ({
    bank,
    credit,
    debit,
    balance: credit - debit,
  }));

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bank Transactions</h1>
        <Button onClick={downloadAsExcel} variant="outline">Download as Excel</Button>
      </div>
      
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="max-w-xs"
          />
          <Button disabled={isLoading}>
            {isLoading ? "Importing..." : "Import CSV"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference Number</TableHead>
                <TableHead>Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.vendor}</TableCell>
                  <TableCell className="text-right">
                    ₹{transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      transaction.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.reference_number}</TableCell>
                  <TableCell>{transaction.payment_method}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No transactions found. Import a CSV file to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead className="text-right">Total Credit</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankRows.map(row => (
                <TableRow key={row.bank}>
                  <TableCell>{row.bank}</TableCell>
                  <TableCell className="text-right">₹{row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">₹{row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-bold {row.balance >= 0 ? 'text-green-700' : 'text-red-700'}">₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              {bankRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">No data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
