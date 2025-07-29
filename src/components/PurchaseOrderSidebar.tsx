import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/public/Veshad_Letter-Final__1_-removebg-preview.png";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  company: string;
  date: string;
  description: string;
  amount: number;
}

const getSavedOrders = () => {
  const stored = localStorage.getItem("veshad_purchase_orders");
  return stored ? JSON.parse(stored) : [];
};
const saveOrder = (order: PurchaseOrder) => {
  const orders = getSavedOrders();
  const idx = orders.findIndex((o: PurchaseOrder) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  localStorage.setItem("veshad_purchase_orders", JSON.stringify(orders));
};

export default function PurchaseOrderSidebar() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(getSavedOrders());
  const [form, setForm] = useState<PurchaseOrder | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    setForm({
      id: Date.now().toString(),
      orderNumber: "",
      company: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: 0,
    });
    setShowForm(true);
  };
  const handleSave = () => {
    if (!form) return;
    saveOrder(form);
    setOrders(getSavedOrders());
    setShowForm(false);
  };
  return (
    <aside className="w-80 bg-white border-r shadow-md h-full flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b">
        <img src={logo} alt="Company Logo" className="h-10 w-auto" />
        <span className="text-xl font-bold text-blue-900">Purchase Order</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Button className="mb-4 w-full" onClick={handleAdd} variant="default">+ Add Purchase Order</Button>
        {orders.length === 0 && <div className="text-gray-500 text-center">No purchase orders yet.</div>}
        {orders.map(order => (
          <Card key={order.id} className="mb-4">
            <CardHeader>
              <CardTitle>Order #{order.orderNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">{order.company}</div>
              <div className="text-xs text-gray-500">{order.date}</div>
              <div className="mt-2 text-sm">{order.description}</div>
              <div className="mt-2 font-bold text-blue-700">₹{order.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showForm && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add Purchase Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Input placeholder="Order Number" value={form?.orderNumber || ""} onChange={e => setForm(f => f && ({ ...f, orderNumber: e.target.value }))} />
                <Input placeholder="Company" value={form?.company || ""} onChange={e => setForm(f => f && ({ ...f, company: e.target.value }))} />
                <Input type="date" value={form?.date || ""} onChange={e => setForm(f => f && ({ ...f, date: e.target.value }))} />
                <Textarea placeholder="Description" value={form?.description || ""} onChange={e => setForm(f => f && ({ ...f, description: e.target.value }))} />
                <Input type="number" placeholder="Amount" value={form?.amount || 0} onChange={e => setForm(f => f && ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleSave} className="bg-blue-600 text-white flex-1">Save</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </aside>
  );
}
