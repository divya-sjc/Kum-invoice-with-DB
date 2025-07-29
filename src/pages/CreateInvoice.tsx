import { SidebarTrigger } from "@/components/ui/sidebar";
import InvoiceForm from "../components/InvoiceForm";


const CreateInvoice: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Invoice
        </h1>
      </div>
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoice;
