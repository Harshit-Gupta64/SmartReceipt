"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function InvoicesPage() {
  const { user } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    invoice_number: "",
    due_date: "",
    notes: "",
  });
  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
    }
  }, [user]);

  async function fetchInvoices() {
    const { data } = await supabase
      .from("invoices")
      .select("*, clients(name)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user?.id);
    setClients(data || []);
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function updateItem(index: number, field: string, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  async function createInvoice() {
    if (!form.client_id || !form.invoice_number) return;
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        ...form,
        user_id: user?.id,
        subtotal,
        tax,
        total,
        status: "unpaid",
      })
      .select()
      .single();

    if (invoice) {
      await supabase.from("invoice_items").insert(
        items.map((item) => ({
          invoice_id: invoice.id,
          ...item,
          total: item.quantity * item.unit_price,
        }))
      );
    }

    setForm({ client_id: "", invoice_number: "", due_date: "", notes: "" });
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setOpen(false);
    fetchInvoices();
  }

  const filtered = invoices.filter((inv) =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  function getStatusColor(status: string) {
    if (status === "paid") return "default";
    if (status === "overdue") return "destructive";
    return "outline";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Create and track your invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              >
                <option value="">Select Client *</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Invoice Number * (e.g. INV-001)"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Due Date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Items</p>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className="col-span-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                    />
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unit_price || ""}
                        onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        disabled={items.length === 1}
                      >
                        ✕
                      </Button>
                    </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full">
                + Add Item
              </Button>
            </div>
              <div className="border rounded-md p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button onClick={createInvoice} className="w-full">
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No invoices yet. Create your first invoice!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                  <Badge variant={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Client: {invoice.clients?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Due: {invoice.due_date || "No due date"}
                </p>
                <p className="text-xl font-bold">₹{invoice.total?.toFixed(2)}</p>
                <div className="flex gap-2">
                  {invoice.status !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await supabase
                          .from("invoices")
                          .update({ status: "paid" })
                          .eq("id", invoice.id);
                        
                          console.log("Client email:", invoice.clients?.email);
                          console.log("Client name:", invoice.clients?.name);
                          if (invoice.clients?.email) {
                            await fetch("/api/email", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                type: "payment_confirmed",
                                to: invoice.clients.email,
                                clientName: invoice.clients.name,
                                invoiceNumber: invoice.invoice_number,
                                total: invoice.total,
                              }),
                          });
                        }
                        fetchInvoices();
                      }}
                    >
                      Mark Paid
                    </Button>
                  )}
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}