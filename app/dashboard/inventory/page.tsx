"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory2";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  quantity: number;
  unit_cost: number;
  reorder_point: number;
  expiry_date: string | null;
  supplier_id: string | null;
  vendors?: { name: string } | null;
};

type VendorRow = {
  id: string;
  name: string;
};

export default function InventoryPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  function resetForm() {
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
    setEditingProductId(null);
  }

  const fetchProducts = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("products")
      .select("*, vendors(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setProducts((data as ProductRow[]) || []);
    setLoading(false);
  }, [userId]);

  const fetchVendors = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", userId);
    setVendors((data as VendorRow[]) || []);
  }, [userId]);

  useEffect(() => {
    void fetchProducts();
    void fetchVendors();
  }, [fetchProducts, fetchVendors]);

  async function saveProduct() {
    if (!form.name || !form.sku) return;

    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      reorder_point: Number(form.reorder_point) || 0,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
    };

    if (editingProductId) {
      await supabase.from("products").update(payload).eq("id", editingProductId);
    } else {
      await supabase.from("products").insert({
        ...payload,
        user_id: userId,
      });
    }

    resetForm();
    setOpen(false);
    void fetchProducts();
  }

  function openAddDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(product: ProductRow) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category || "",
      quantity: String(product.quantity),
      unit_cost: String(product.unit_cost),
      reorder_point: String(product.reorder_point),
      supplier_id: product.supplier_id || "",
      expiry_date: product.expiry_date || "",
    });
    setOpen(true);
  }

  async function deleteProduct() {
    if (!deleteId) return;
    await supabase.from("stock_movements").delete().eq("product_id", deleteId);
    await supabase.from("inventory_alerts").delete().eq("product_id", deleteId);
    await supabase.from("products").delete().eq("id", deleteId);
    setDeleteId(null);
    void fetchProducts();
  }

  async function updateQuantity(id: string, delta: number, reason: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newQty = product.quantity + delta;
    if (newQty < 0) return;
    await supabase.from("products").update({ quantity: newQty }).eq("id", id);
    await supabase.from("stock_movements").insert({
      product_id: id,
      user_id: userId,
      delta,
      reason,
    });
    void fetchProducts();
  }

  function getStockStatus(product: ProductRow): {
    label: string;
    color: "error" | "warning" | "success";
  } {
    if (product.quantity === 0)
      return { label: "Out of Stock", color: "error" };
    if (product.quantity <= product.reorder_point)
      return { label: "Low Stock", color: "warning" };
    return { label: "Healthy", color: "success" };
  }

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4">Inventory</Typography>
          <Typography color="text.secondary">
            Track your stock levels
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
        >
          Add Product
        </Button>
      </Stack>

      <TextField
        size="small"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid key={`inventory-skeleton-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={<Skeleton variant="text" width="46%" height={30} />}
                  subheader={<Skeleton variant="text" width="34%" />}
                  action={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Skeleton variant="rounded" width={78} height={24} />
                      <Skeleton variant="circular" width={30} height={30} />
                      <Skeleton variant="circular" width={30} height={30} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="86%" />
                    <Skeleton variant="text" width="78%" />
                    <Skeleton variant="text" width="72%" />
                    <Skeleton variant="rounded" width={90} height={24} />
                    <Stack direction="row" spacing={1} pt={1}>
                      <Skeleton variant="rounded" width={96} height={32} />
                      <Skeleton variant="rounded" width={80} height={32} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <InventoryIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography mt={1.5} color="text.secondary">
            No products yet. Add your first product!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((product) => {
            const status = getStockStatus(product);
            return (
              <Grid key={product.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card>
                  <CardHeader
                    title={product.name}
                    subheader={`SKU: ${product.sku}`}
                    sx={{ pb: 0.5 }}
                    action={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                        />
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(product)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    }
                  />
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {product.quantity}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Unit Cost
                        </Typography>
                        <Typography variant="body2">
                          ₹{product.unit_cost}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Reorder At
                        </Typography>
                        <Typography variant="body2">
                          {product.reorder_point} units
                        </Typography>
                      </Stack>
                      {product.category && (
                        <Chip
                          label={product.category}
                          size="small"
                          variant="outlined"
                          sx={{ alignSelf: "flex-start" }}
                        />
                      )}
                      {product.expiry_date && (
                        <Typography variant="caption" color="text.secondary">
                          Expires: {product.expiry_date}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} pt={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() =>
                            updateQuantity(product.id, 1, "restock")
                          }
                        >
                          Restock
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<RemoveIcon />}
                          onClick={() =>
                            updateQuantity(product.id, -1, "sale")
                          }
                          disabled={product.quantity === 0}
                        >
                          Sale
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Product Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingProductId ? "Edit Product" : "Add New Product"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Product Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              size="small"
            />
            <TextField
              label="SKU * (e.g. SKU-001)"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              size="small"
            />
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              size="small"
            />
            <TextField
              label="Initial Quantity"
              type="number"
              value={form.quantity || ""}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              size="small"
            />
            <TextField
              label="Unit Cost (₹)"
              type="number"
              value={form.unit_cost || ""}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              size="small"
            />
            <TextField
              label="Reorder Point (alert threshold)"
              type="number"
              value={form.reorder_point || ""}
              onChange={(e) =>
                setForm({ ...form, reorder_point: e.target.value })
              }
              size="small"
            />
            <Select
              value={form.supplier_id}
              onChange={(e) =>
                setForm({ ...form, supplier_id: e.target.value })
              }
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Supplier (optional)</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Expiry Date (optional)"
              type="date"
              value={form.expiry_date}
              onChange={(e) =>
                setForm({ ...form, expiry_date: e.target.value })
              }
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveProduct()}>
            {editingProductId ? "Update Product" : "Save Product"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this product? All stock movements
            and alerts will also be deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void deleteProduct()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}