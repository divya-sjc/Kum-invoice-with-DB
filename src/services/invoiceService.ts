import api from './api';
import { Invoice } from '../types/invoice';

export const invoiceService = {
  // Get all invoices
  getAllInvoices: async () => {
    const response = await api.get('/invoices');
    return response.data;
  },

  // Get a single invoice by ID
  getInvoice: async (id: string) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // Create a new invoice
  createInvoice: async (invoice: Invoice) => {
    const response = await api.post('/invoices', invoice);
    return response.data;
  },

  // Update an invoice
  updateInvoice: async (id: string, invoice: Invoice) => {
    const response = await api.put(`/invoices/${id}`, invoice);
    return response.data;
  },

  // Delete an invoice
  deleteInvoice: async (id: string) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  }
};

export default invoiceService;
