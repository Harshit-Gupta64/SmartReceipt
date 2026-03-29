"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Inventory Purchase",
  "Marketing",
  "Travel",
  "Miscellaneous",
];

export default function ExpensesPage() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    expense_date: "",
    vendor_id: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchVendors();
    }
  }, [user]);

  async function fetchExpenses() {
    const { data } = await supabase
      .from("expenses")
      .select("*, vendors(name)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  async function fetchVendors() {
    const { data } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", user?.id);
    setVendors(data || []);
  }

  async function addExpense() {
    if (!form.title || !form.amount || !form.category) return;
    await supabase.from("expenses").insert({
      ...form,
      amount: Number(form.amount),
      user_id: user?.id,
      vendor_id: form.vendor_id || null,
    });
    setForm({
      title: "",
      amount: "",
      category: "",
      expense_date: "",
      vendor_id: "",
      notes: "",
    });
    setOpen(false);
    fetchExpenses();
  }

  const filtered = expenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Track your business expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Expense Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Amount (₹) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select Category *</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              >
                <option value="">Select Vendor (optional)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button onClick={addExpense} className="w-full">
                Save Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">₹{totalExpenses.toFixed(2)}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No expenses yet. Add your first expense!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((expense) => (
            <Card key={expense.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{expense.title}</CardTitle>
                  <Badge variant="outline">{expense.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">₹{Number(expense.amount).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  Vendor: {expense.vendors?.name || "No vendor"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: {expense.expense_date || "No date"}
                </p>
                {expense.notes && (
                  <p className="text-sm text-muted-foreground">{expense.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}