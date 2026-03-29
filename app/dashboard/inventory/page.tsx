"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function InventoryPage() {
  const { user } = useUser();
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    unit_cost: "",
    reorder_point: "",
    supplier_id: "",
    expiry_date: "",
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchVendors();
    }
  }, [user]);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*, vendors(name)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }

  async function fetchVendors() {
    const { data } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", user?.id);
    setVendors(data || []);
  }

  async function addProduct() {
    if (!form.name || !form.sku) return;
    await supabase.from("products").insert({
      ...form,
      quantity: Number(form.quantity),
      unit_cost: Number(form.unit_cost),
      reorder_point: Number(form.reorder_point),
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      user_id: user?.id,
    });
    setForm({
      name: "",
      sku: "",
      category: "",
      quantity: "",
      unit_cost: "",
      reorder_point: "",
      supplier_id: "",
      expiry_date: "",
    });
    setOpen(false);
    fetchProducts();
  }

  async function updateQuantity(id: string, delta: number, reason: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newQty = product.quantity + delta;
    if (newQty < 0) return;
    await supabase
      .from("products")
      .update({ quantity: newQty })
      .eq("id", id);
    await supabase.from("stock_movements").insert({
      product_id: id,
      user_id: user?.id,
      delta,
      reason,
    });
    fetchProducts();
  }

  function getStockStatus(product: any) {
    if (product.quantity === 0) return { label: "Out of Stock", variant: "destructive" };
    if (product.quantity <= product.reorder_point) return { label: "Low Stock", variant: "secondary" };
    return { label: "Healthy", variant: "outline" };
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">Track your stock levels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Product Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="SKU * (e.g. SKU-001)"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
              <Input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Initial Quantity"
                value={form.quantity || ""}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Unit Cost (₹)"
                value={form.unit_cost || ""}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Reorder Point (alert threshold)"
                value={form.reorder_point || ""}
                onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
              />
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              >
                <option value="">Select Supplier (optional)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                placeholder="Expiry Date (optional)"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
              <Button onClick={addProduct} className="w-full">
                Save Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No products yet. Add your first product!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const status = getStockStatus(product);
            return (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant={status.variant as any}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-bold text-lg">{product.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Cost</span>
                    <span>₹{product.unit_cost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reorder At</span>
                    <span>{product.reorder_point} units</span>
                  </div>
                  {product.category && (
                    <Badge variant="outline">{product.category}</Badge>
                  )}
                  {product.expiry_date && (
                    <p className="text-xs text-muted-foreground">
                      Expires: {product.expiry_date}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(product.id, 1, "restock")}
                    >
                      + Restock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(product.id, -1, "sale")}
                      disabled={product.quantity === 0}
                    >
                      - Sale
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}