"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory2";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Alert,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type ImportResult = {
  severity: "success" | "warning" | "error";
  message: string;
  details?: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function productCompletenessScore(product: ProductRow): number {
  return [
    product.category,
    product.supplier_id,
    product.expiry_date,
    product.quantity > 0 ? "1" : "",
    product.unit_cost > 0 ? "1" : "",
    product.reorder_point > 0 ? "1" : "",
  ].filter(Boolean).length;
}

export default function InventoryPage() {
  const { user } = useUser();
  const userId = user?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
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

  async function generatePurchaseOrder(product: ProductRow) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const today = new Date().toLocaleDateString("en-IN");
    const orderQty = Math.max(product.reorder_point * 2 - product.quantity, 1);

    doc.setFontSize(20);
    doc.text("Purchase Order", 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`PO Number: ${poNumber}`, 14, 30);
    doc.text(`Date: ${today}`, 14, 37);
    doc.text(`Supplier: ${product.vendors?.name || "Not specified"}`, 14, 44);

    autoTable(doc, {
      startY: 52,
      head: [["SKU", "Product", "Current Stock", "Reorder Point", "Order Qty", "Unit Cost", "Total"]],
      body: [[
        product.sku,
        product.name,
        product.quantity,
        product.reorder_point,
        orderQty,
        `Rs. ${product.unit_cost}`,
        `Rs. ${(orderQty * product.unit_cost).toFixed(2)}`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Order Value: Rs. ${(orderQty * product.unit_cost).toFixed(2)}`, 14, finalY);
    doc.text("Please process this order at your earliest convenience.", 14, finalY + 8);

    doc.save(`PO-${product.sku}-${poNumber}.pdf`);
  }

  async function importProductsFromFile(file: File) {
    if (!userId) return;

    setImporting(true);
    setImportResult(null);

    try {
      const XLSX = await import("xlsx");
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setImportResult({
          severity: "error",
          message: "The uploaded file does not contain any sheet.",
        });
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheetName],
        { defval: "" }
      );

      if (rows.length === 0) {
        setImportResult({
          severity: "warning",
          message: "No rows found in file.",
        });
        return;
      }

      const vendorByName = new Map(
        vendors.map((vendor) => [vendor.name.toLowerCase().trim(), vendor.id])
      );

      const findOrCreateSupplierId = async (rawSupplierName: unknown) => {
        const supplierName = String(rawSupplierName || "").trim();
        if (!supplierName) return null;

        const key = supplierName.toLowerCase();
        const cachedId = vendorByName.get(key);
        if (cachedId) return cachedId;

        const { data: existingVendor } = await supabase
          .from("vendors")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", supplierName)
          .maybeSingle();

        if (existingVendor?.id) {
          vendorByName.set(key, existingVendor.id);
          return existingVendor.id;
        }

        const { data: createdVendor, error: createVendorError } = await supabase
          .from("vendors")
          .insert({
            user_id: userId,
            name: supplierName,
          })
          .select("id, name")
          .single();

        if (!createVendorError && createdVendor?.id) {
          vendorByName.set(key, createdVendor.id);
          return createdVendor.id;
        }

        return null;
      };

      const parseNumber = (value: unknown, fallback = 0): number => {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
      };

      const parseDate = (value: unknown): string | null => {
        if (value === null || value === undefined || value === "") return null;

        if (typeof value === "number") {
          const parsed = XLSX.SSF.parse_date_code(value);
          if (!parsed) return null;
          const month = String(parsed.m).padStart(2, "0");
          const day = String(parsed.d).padStart(2, "0");
          return `${parsed.y}-${month}-${day}`;
        }

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          return value.toISOString().slice(0, 10);
        }

        const text = String(value).trim();
        if (!text) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

        const parsedDate = new Date(text);
        if (Number.isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString().slice(0, 10);
      };

      let insertedCount = 0;
      let updatedCount = 0;
      let adjustedSkuCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const isSkuDuplicateError = (message?: string) =>
        (message || "").toLowerCase().includes("products_sku_key") ||
        (message || "").toLowerCase().includes("duplicate key value");

      const userSuffix = String(userId || "user")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-6)
        .toUpperCase() || "USER";

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
        );

        const name = String(
          normalized.name || normalized.product_name || normalized.item_name || ""
        ).trim();
        const sku = String(
          normalized.sku || normalized.product_sku || normalized.item_code || ""
        ).trim();

        if (!name || !sku) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Missing required name or sku.`);
          }
          continue;
        }

        const supplierText = String(
          normalized.supplier || normalized.vendor || normalized.supplier_name || ""
        ).trim();
        const supplierId = await findOrCreateSupplierId(supplierText);

        const payload = {
          user_id: userId,
          name,
          sku,
          category: String(normalized.category || "").trim() || null,
          quantity: parseNumber(normalized.quantity ?? normalized.qty ?? normalized.stock),
          unit_cost: parseNumber(
            normalized.unit_cost ?? normalized.unit_price ?? normalized.cost
          ),
          reorder_point: parseNumber(
            normalized.reorder_point ?? normalized.reorder ?? normalized.reorder_at
          ),
          expiry_date: parseDate(
            normalized.expiry_date ?? normalized.expiry ?? normalized.expirydate
          ),
          supplier_id: supplierId,
        };

        const { error } = await supabase.from("products").insert(payload);
        if (!error) {
          insertedCount += 1;
          continue;
        }

        if (isSkuDuplicateError(error.message)) {
          const { data: existingOwnedProduct } = await supabase
            .from("products")
            .select("id")
            .eq("user_id", userId)
            .eq("sku", sku)
            .maybeSingle();

          if (existingOwnedProduct?.id) {
            const { error: updateError } = await supabase
              .from("products")
              .update({
                name: payload.name,
                category: payload.category,
                quantity: payload.quantity,
                unit_cost: payload.unit_cost,
                reorder_point: payload.reorder_point,
                expiry_date: payload.expiry_date,
                supplier_id: payload.supplier_id,
              })
              .eq("id", existingOwnedProduct.id)
              .eq("user_id", userId);

            if (!updateError) {
              updatedCount += 1;
              continue;
            }

            failedCount += 1;
            if (errors.length < 6) {
              errors.push(`Row ${index + 2}: ${updateError.message}`);
            }
            continue;
          }

          let adjustedSuccessfully = false;
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const adjustedSku =
              attempt === 0
                ? `${sku}-${userSuffix}`
                : `${sku}-${userSuffix}-${attempt + 1}`;

            const { error: adjustedInsertError } = await supabase
              .from("products")
              .insert({ ...payload, sku: adjustedSku });

            if (!adjustedInsertError) {
              adjustedSkuCount += 1;
              adjustedSuccessfully = true;
              if (errors.length < 6) {
                errors.push(
                  `Row ${index + 2}: SKU ${sku} already exists globally, imported as ${adjustedSku}.`
                );
              }
              break;
            }

            if (!isSkuDuplicateError(adjustedInsertError.message)) {
              if (errors.length < 6) {
                errors.push(`Row ${index + 2}: ${adjustedInsertError.message}`);
              }
              break;
            }
          }

          if (adjustedSuccessfully) {
            continue;
          }
        }

        failedCount += 1;
        if (errors.length < 6) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      if (insertedCount > 0 || updatedCount > 0 || adjustedSkuCount > 0) {
        void fetchProducts();
      }

      if (insertedCount + updatedCount + adjustedSkuCount > 0 && failedCount === 0) {
        setImportResult({
          severity: "success",
          message: `Imported ${insertedCount}, updated ${updatedCount}, adjusted SKU ${adjustedSkuCount}.`,
        });
      } else if (insertedCount + updatedCount + adjustedSkuCount > 0 && failedCount > 0) {
        setImportResult({
          severity: "warning",
          message: `Imported ${insertedCount}, updated ${updatedCount}, adjusted SKU ${adjustedSkuCount}. ${failedCount} row(s) failed.`,
          details: errors,
        });
      } else {
        setImportResult({
          severity: "error",
          message: "Import failed. No products were added.",
          details: errors.length > 0 ? errors : ["Check column names and data values."],
        });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Failed to read file. Use a valid .xlsx, .xls, or .csv file.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function cleanupDuplicateProducts() {
    if (!userId || cleaning) return;

    const shouldContinue = window.confirm(
      "This will merge duplicate products by SKU, re-link stock records, and permanently delete duplicate product rows. Continue?"
    );
    if (!shouldContinue) return;

    setCleaning(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category, quantity, unit_cost, reorder_point, expiry_date, supplier_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setImportResult({ severity: "error", message: error.message });
        return;
      }

      const allProducts = (data as ProductRow[]) || [];
      const groups = new Map<string, ProductRow[]>();

      for (const product of allProducts) {
        const key = product.sku.trim().toLowerCase();
        if (!key) continue;
        const current = groups.get(key) || [];
        current.push(product);
        groups.set(key, current);
      }

      let mergedGroups = 0;
      let deletedRows = 0;
      let failedGroups = 0;
      const errors: string[] = [];

      for (const group of groups.values()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort(
          (a, b) => productCompletenessScore(b) - productCompletenessScore(a)
        );
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const mergedPatch = {
          name: primary.name || duplicates.map((p) => p.name).find(Boolean) || primary.name,
          category: primary.category || duplicates.map((p) => p.category).find(Boolean) || null,
          quantity:
            primary.quantity > 0
              ? primary.quantity
              : duplicates.map((p) => p.quantity).find((q) => q > 0) || 0,
          unit_cost:
            primary.unit_cost > 0
              ? primary.unit_cost
              : duplicates.map((p) => p.unit_cost).find((c) => c > 0) || 0,
          reorder_point:
            primary.reorder_point > 0
              ? primary.reorder_point
              : duplicates.map((p) => p.reorder_point).find((r) => r > 0) || 0,
          expiry_date:
            primary.expiry_date || duplicates.map((p) => p.expiry_date).find(Boolean) || null,
          supplier_id:
            primary.supplier_id || duplicates.map((p) => p.supplier_id).find(Boolean) || null,
        };

        const { error: patchError } = await supabase
          .from("products")
          .update(mergedPatch)
          .eq("id", primary.id)
          .eq("user_id", userId);

        if (patchError) {
          failedGroups += 1;
          if (errors.length < 6) {
            errors.push(`Could not patch product ${primary.sku}: ${patchError.message}`);
          }
          continue;
        }

        let groupFailed = false;
        for (const duplicate of duplicates) {
          const { error: movementUpdateError } = await supabase
            .from("stock_movements")
            .update({ product_id: primary.id })
            .eq("product_id", duplicate.id);

          if (movementUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink stock movements for ${duplicate.sku}: ${movementUpdateError.message}`
              );
            }
            break;
          }

          const { error: alertUpdateError } = await supabase
            .from("inventory_alerts")
            .update({ product_id: primary.id })
            .eq("product_id", duplicate.id);

          if (alertUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink alerts for ${duplicate.sku}: ${alertUpdateError.message}`
              );
            }
            break;
          }

          const { error: deleteError } = await supabase
            .from("products")
            .delete()
            .eq("id", duplicate.id)
            .eq("user_id", userId);

          if (deleteError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(`Could not delete duplicate ${duplicate.sku}: ${deleteError.message}`);
            }
            break;
          }

          deletedRows += 1;
        }

        if (groupFailed) {
          failedGroups += 1;
        } else {
          mergedGroups += 1;
        }
      }

      void fetchProducts();

      if (mergedGroups > 0 && failedGroups === 0) {
        setImportResult({
          severity: "success",
          message: `Cleanup complete. Merged ${mergedGroups} duplicate group(s), removed ${deletedRows} duplicate row(s).`,
        });
      } else if (mergedGroups > 0 || failedGroups > 0) {
        setImportResult({
          severity: failedGroups > 0 ? "warning" : "success",
          message: `Cleanup finished. Merged ${mergedGroups} group(s), failed ${failedGroups} group(s), removed ${deletedRows} duplicate row(s).`,
          details: errors,
        });
      } else {
        setImportResult({ severity: "success", message: "No duplicate products found." });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Product cleanup failed due to an unexpected error.",
      });
    } finally {
      setCleaning(false);
    }
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

  function getExpiryStatus(expiryDate: string | null): {
    label: string;
    color: "error" | "warning" | "success";
  } | null {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) return { label: "Expired", color: "error" };
    if (daysLeft <= 30) return { label: `Expires in ${daysLeft}d`, color: "warning" };
    return { label: `Fresh (${daysLeft}d)`, color: "success" };
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
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void cleanupDuplicateProducts()}
            disabled={cleaning || importing}
          >
            {cleaning ? "Cleaning..." : "Cleanup Duplicates"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Importing..." : "Import Sheet"}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Add Product
          </Button>
        </Stack>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void importProductsFromFile(file);
            }
            event.target.value = "";
          }}
        />
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
      {/* Expiry Alert Banner */}
        {products.some((p) => {
          if (!p.expiry_date) return false;
          const daysLeft = Math.ceil(
            (new Date(p.expiry_date).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return daysLeft <= 30;
        }) && (
          <Alert severity="warning">
            <Typography variant="body2" fontWeight={600}>
              ⚠️ Expiry Alert
            </Typography>
            {products
              .filter((p) => {
                if (!p.expiry_date) return false;
                const daysLeft = Math.ceil(
                  (new Date(p.expiry_date).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return daysLeft <= 30;
              })
              .map((p) => {
                const daysLeft = Math.ceil(
                  (new Date(p.expiry_date!).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Typography key={p.id} variant="caption" component="div">
                    {daysLeft < 0
                      ? `❌ ${p.name} (${p.sku}) has expired!`
                      : `🟡 ${p.name} (${p.sku}) expires in ${daysLeft} day(s)`}
                  </Typography>
                );
              })}
          </Alert>
        )}
      {importResult ? (
        <Alert severity={importResult.severity}>
          <Typography variant="body2" fontWeight={600}>
            {importResult.message}
          </Typography>
          {importResult.details?.map((detail) => (
            <Typography key={detail} variant="caption" component="div">
              {detail}
            </Typography>
          ))}
        </Alert>
      ) : null}

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
                      {product.expiry_date && (() => {
                        const expiryStatus = getExpiryStatus(product.expiry_date);
                        return expiryStatus ? (
                          <Chip
                            label={`📅 ${expiryStatus.label}`}
                            color={expiryStatus.color}
                            size="small"
                            variant="outlined"
                            sx={{ alignSelf: "flex-start" }}
                          />
                        ) : null;
                      })()}
                      <Stack direction="row" spacing={1} pt={1} flexWrap="wrap">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => updateQuantity(product.id, 1, "restock")}
                        >
                          Restock
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<RemoveIcon />}
                          onClick={() => updateQuantity(product.id, -1, "sale")}
                          disabled={product.quantity === 0}
                        >
                          Sale
                        </Button>
                        {product.quantity <= product.reorder_point && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            startIcon={<ShoppingCartIcon />}
                            onClick={() => void generatePurchaseOrder(product)}
                          >
                            Auto PO
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Product Dialog */}
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
              onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
              size="small"
            />
            <Select
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
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
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
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