import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import InvoiceList from "./pages/InvoiceList";
import CreateInvoice from "./pages/CreateInvoice";
import EditInvoice from "./pages/EditInvoice";
import ViewInvoice from "./pages/ViewInvoice";
import TaxSummary from "./pages/Tax";
import Purchases from "./pages/Purchases";
import PriceComparison from "./pages/PriceComparison";
import VendorsInvoices from "./pages/VendorsInvoices";
import VendorsNames from "./pages/VendorsNames";
import DeliveryChallan from "./pages/DeliveryChallan";
import CompanyLetterHead from "./pages/CompanyLetterHead";
import PendingInvoices from "./pages/PendingInvoices";
import BankTransactions from "./pages/BankTransactions";
import VendorsItems from "./pages/VendorsItems";

const queryClient = new QueryClient();


// Listen for custom toast events from anywhere in the app
if (typeof window !== 'undefined') {
  window.addEventListener('show-toast', (e: any) => {
    const { type, message } = e.detail || {};
    if (type === 'error' && window['sonner']) {
      window['sonner'](message, { type: 'error' });
    } else if (window['sonner']) {
      window['sonner'](message);
    }
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner ref={el => { if (el) window['sonner'] = el; }} />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1 overflow-auto">
                <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/invoices/edit/:invoiceNumber*" element={<EditInvoice />} />
                <Route path="/invoices/view/:invoiceNumber" element={<ViewInvoice />} />
                <Route path="/tax" element={<TaxSummary />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/price-comparison" element={<PriceComparison />} />
                <Route path="/vendors-invoices" element={<VendorsInvoices />} />
                <Route path="/vendors-names" element={<VendorsNames />} />
                <Route path="/vendors-items" element={<VendorsItems />} />
                <Route path="/delivery-challan" element={<DeliveryChallan />} />
                <Route path="/letter" element={<CompanyLetterHead />} />
                <Route path="/pending-invoices" element={<PendingInvoices />} />
                <Route path="/bank-transactions" element={<BankTransactions />} />
                </Routes>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
