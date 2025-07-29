import { useState, useCallback } from 'react';
import { VendorInvoice, validateVendorInvoice } from '@/types/vendorInvoice';

interface UseVendorInvoicesReturn {
  rows: VendorInvoice[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  addRow: () => void;
  removeRow: (idx: number) => Promise<void>;
  toggleLock: (idx: number) => Promise<void>;
  handleChange: (idx: number, field: keyof VendorInvoice, value: any) => void;
  handleSave: () => Promise<void>;
  refresh: () => Promise<void>;
}

const API_BASE = 'http://localhost:4000/api/vendors-invoices';

export function useVendorInvoices(): UseVendorInvoicesReturn {
  const [rows, setRows] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultRow: VendorInvoice = {
    vendorName: "",
    itemName: "",
    totalInvoiceValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    paymentStatus: "Pending",
    veshadInvoiceRefNo: "",
    veshadInvoiceValue: 0,
    veshadSgst: 0,
    veshadCgst: 0,
    veshadIgst: 0,
    locked: false
  };

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_BASE);
      if (!res.ok) {
        throw new Error('Failed to fetch vendor invoices');
      }
      const data = await res.json();
      setRows(data);
      localStorage.setItem("vendorsinv", JSON.stringify(data));
    } catch (err) {
      console.error('Error loading vendor invoices:', err);
      setError('Failed to load vendor invoices. Using cached data.');
      const saved = localStorage.getItem("vendorsinv");
      if (saved) setRows(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { ...defaultRow }]);
  }, []);

  const removeRow = useCallback(async (idx: number) => {
    const row = rows[idx];
    if (!row.id) {
      setRows(prev => prev.filter((_, i) => i !== idx));
      return;
    }

    if (!confirm('Are you sure you want to delete this vendor invoice?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${row.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete vendor invoice');
      }

      setRows(prev => {
        const updated = prev.filter((_, i) => i !== idx);
        localStorage.setItem("vendorsinv", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete vendor invoice:', error);
      alert(error.message || 'Failed to delete vendor invoice. Please try again.');
    }
  }, [rows]);

  const toggleLock = useCallback(async (idx: number) => {
    const row = rows[idx];
    if (!row.id) {
      alert('Please save the row first before locking/unlocking.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${row.id}/toggle-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle lock status');
      }

      const updatedInvoice = await response.json();
      
      setRows(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], locked: updatedInvoice.locked };
        localStorage.setItem("vendorsinv", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Failed to toggle lock status:', error);
      alert(error.message || 'Failed to toggle lock status. Please try again.');
    }
  }, [rows]);

  const handleChange = useCallback((idx: number, field: keyof VendorInvoice, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    let saveError = false;
    let errorMessage = '';
    
    try {
      // Validate all rows before saving
      const errors: { row: number; errors: string[] }[] = [];
      rows.forEach((row, idx) => {
        const rowErrors = validateVendorInvoice(row);
        if (rowErrors.length > 0) {
          errors.push({ row: idx + 1, errors: rowErrors });
        }
      });

      if (errors.length > 0) {
        throw new Error(
          'Validation errors:\n' +
          errors.map(({ row, errors }) => 
            `Row ${row}:\n${errors.map(e => `- ${e}`).join('\n')}`
          ).join('\n\n')
        );
      }

      // Save to backend (PUT for existing, POST for new)
      const savePromises = rows.map(async row => {
        const { id, ...rowToSave } = row;
        // Map frontend fields to backend expected fields
        const backendRow = {
          invoiceNumber: row.invoiceNumber || '',
          vendorName: row.vendorName || '',
          itemNameBrief: row.itemName || '',
          date: row.createdAt || '',
          totalInvoiceValue: Number(row.totalInvoiceValue) || 0,
          vendorCgst: Number(row.cgst) || 0,
          vendorSgst: Number(row.sgst) || 0,
          vendorIgst: Number(row.igst) || 0,
          paymentStatusVendor: row.paymentStatus || 'Pending',
          veshadInvoiceRef: row.veshadInvoiceRefNo || '',
          veshadInvoiceValue: Number(row.veshadInvoiceValue) || 0,
          veshadSgst: Number(row.veshadSgst) || 0,
          veshadCgst: Number(row.veshadCgst) || 0,
          veshadIgst: Number(row.veshadIgst) || 0,
          profitPercent: row.profitPercent !== undefined && row.profitPercent !== null ? Number(row.profitPercent) : null,
          miscNotes: '',
          locked: !!row.locked
        };
        try {
          if (id) {
            const res = await fetch(`${API_BASE}/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(backendRow)
            });
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to update invoice');
            }
            return row;
          } else {
            const res = await fetch(API_BASE, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(backendRow)
            });
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to create invoice');
            }
            const data = await res.json();
            return { ...row, id: data.id };
          }
        } catch (e) {
          saveError = true;
          errorMessage = e.message;
          return row;
        }
      });

      const savedRows = await Promise.all(savePromises);

      if (!saveError) {
        await refresh();
      }
    } catch (e) {
      saveError = true;
      errorMessage = e.message;
    }
    
    setSaving(false);
    
    if (saveError) {
      alert(`Error saving to database:\n${errorMessage}`);
    } else {
      alert('Data saved successfully!');
    }
  }, [rows, refresh]);

  return {
    rows,
    loading,
    saving,
    error,
    addRow,
    removeRow,
    toggleLock,
    handleChange,
    handleSave,
    refresh
  };
}
