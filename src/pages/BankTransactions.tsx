import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';

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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
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

  // Download bankRows as Excel
  const downloadBankRowsAsExcel = () => {
    if (!bankRows.length) return;
    const data = bankRows.map(row => ({
      'Bank Name': row.bank,
      'Total Credit': row.credit,
      'Total Debit': row.debit,
      'Balance': row.balance
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BankBalances');
    XLSX.writeFile(wb, 'bank_balances.xlsx');
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

  // Calculate totals for balances
  const totalBankBalance = bankRows.reduce((sum, row) => sum + row.balance, 0);

  // Group by invoice number and calculate consolidated credit/debit
  const invoiceMap: Record<string, { credit: number; debit: number }> = {};
  purchases.forEach(p => {
    const invoice = p.invoiceNo || 'Unknown';
    if (!invoiceMap[invoice]) invoiceMap[invoice] = { credit: 0, debit: 0 };
    invoiceMap[invoice].credit += p.credit || 0;
    invoiceMap[invoice].debit += p.debit || 0;
  });
  const invoiceRows = Object.entries(invoiceMap).map(([invoice, { credit, debit }]) => ({
    invoice,
    credit,
    debit,
    balance: credit - debit,
  }));

  // Calculate totals for balances
  const totalInvoiceBalance = invoiceRows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bank Transactions</h1>
        <Button onClick={downloadBankRowsAsExcel} variant="outline">Download as Excel</Button>
      </div>
      <div className="flex gap-4 flex-wrap">
        {/* Left: Bank summary table */}
        <Card className="p-3 flex-1 min-w-[320px] max-w-[50%]">
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1">Bank Name</TableHead>
                  <TableHead className="text-right px-2 py-1">Total Credit</TableHead>
                  <TableHead className="text-right px-2 py-1">Total Debit</TableHead>
                  <TableHead className="text-right px-2 py-1">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankRows.map(row => (
                  <TableRow key={row.bank}>
                    <TableCell className="px-2 py-1">{row.bank}</TableCell>
                    <TableCell className="text-right px-2 py-1">₹{row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right px-2 py-1">₹{row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right font-bold px-2 py-1 ${row.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                {bankRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 px-2 py-1">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <tfoot>
                <TableRow>
                  <TableCell className="font-bold px-2 py-1">Total</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className={`text-right font-bold px-2 py-1 ${totalBankBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{totalBankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </Card>
        {/* Right: Invoice summary table */}
        <Card className="p-3 flex-1 min-w-[320px] max-w-[50%]">
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1">Invoice Number</TableHead>
                  <TableHead className="text-right px-2 py-1">Total Credit</TableHead>
                  <TableHead className="text-right px-2 py-1">Total Debit</TableHead>
                  <TableHead className="text-right px-2 py-1">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceRows.map(row => (
                  <TableRow key={row.invoice}>
                    <TableCell className="px-2 py-1">{row.invoice}</TableCell>
                    <TableCell className="text-right px-2 py-1">₹{row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right px-2 py-1">₹{row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right font-bold px-2 py-1 ${row.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                {invoiceRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 px-2 py-1">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <tfoot>
                <TableRow>
                  <TableCell className="font-bold px-2 py-1">Total</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className={`text-right font-bold px-2 py-1 ${totalInvoiceBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{totalInvoiceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
