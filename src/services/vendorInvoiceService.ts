import api from './api';
import { VendorInvoice } from '../types/vendorInvoice';

export const vendorInvoiceService = {
  // Get all vendor invoices
  getAllVendorInvoices: async () => {
    const response = await api.get('/vendors-invoices');
    return response.data;
  },

  // Get a single vendor invoice by ID
  getVendorInvoice: async (id: string) => {
    const response = await api.get(`/vendors-invoices/${id}`);
    return response.data;
  },

  // Create a new vendor invoice
  createVendorInvoice: async (vendorInvoice: VendorInvoice) => {
    // Map amountWithoutGst to backend field
    const payload = { ...vendorInvoice, amountWithoutGst: vendorInvoice.amountWithoutGst };
    const response = await api.post('/vendors-invoices', payload);
    return response.data;
  },

  // Update a vendor invoice
  updateVendorInvoice: async (id: string, vendorInvoice: VendorInvoice) => {
    // Map amountWithoutGst to backend field
    const payload = { ...vendorInvoice, amountWithoutGst: vendorInvoice.amountWithoutGst };
    const response = await api.put(`/vendors-invoices/${id}`, payload);
    return response.data;
  },

  // Delete a vendor invoice
  deleteVendorInvoice: async (id: string) => {
    const response = await api.delete(`/vendors-invoices/${id}`);
    return response.data;
  }
};
