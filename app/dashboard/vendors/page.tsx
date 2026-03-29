"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import StoreIcon from "@mui/icons-material/Store";
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type VendorRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type ImportResult = {
  severity: "success" | "warning" | "error";
  message: string;
  details?: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function vendorCompletenessScore(vendor: VendorRow): number {
  return [vendor.email, vendor.phone, vendor.address].filter(Boolean).length;
}

function dedupeVendorsByName(rows: VendorRow[]): VendorRow[] {
  const byName = new Map<string, VendorRow>();

  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;

    const existing = byName.get(key);
    if (!existing || vendorCompletenessScore(row) > vendorCompletenessScore(existing)) {
      byName.set(key, row);
    }
  }

  return Array.from(byName.values());
}

export default function VendorsPage() {
  const { user } = useUser();
  const userId = user?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [open, setOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hasExpenses, setHasExpenses] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchVendors = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const typedVendors = (data as VendorRow[]) || [];
    setVendors(dedupeVendorsByName(typedVendors));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  async function addVendor() {
    if (!form.name) return;
    await supabase.from("vendors").insert({ ...form, user_id: userId });
    setForm({ name: "", email: "", phone: "", address: "" });
    setOpen(false);
    void fetchVendors();
  }

  async function updateVendor() {
    if (!editVendor || !form.name) return;
    await supabase.from("vendors").update({ ...form }).eq("id", editVendor.id);
    setEditVendor(null);
    setForm({ name: "", email: "", phone: "", address: "" });
    void fetchVendors();
  }

  function openEdit(vendor: VendorRow) {
    setEditVendor(vendor);
    setForm({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
    });
  }

  async function openDelete(vendorId: string) {
    setDeleteId(vendorId);
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("vendor_id", vendorId);
    if (expenses && expenses.length > 0) {
      setHasExpenses(true);
      setExpenseCount(expenses.length);
    } else {
      setHasExpenses(false);
      setExpenseCount(0);
    }
  }

  async function deleteVendor(deleteExpenses = false) {
  if (!deleteId) return;
  
  if (deleteExpenses) {
    await supabase.from("expenses").delete().eq("vendor_id", deleteId);
  }
  
  // Unlink products that use this vendor as supplier
  await supabase
    .from("products")
    .update({ supplier_id: null })
    .eq("supplier_id", deleteId);

  const { error } = await supabase.from("vendors").delete().eq("id", deleteId);
  
  if (error) {
    console.error("Delete error:", error);
    return;
  }
  
  setDeleteId(null);
  setHasExpenses(false);
  setExpenseCount(0);
  void fetchVendors();
}

  async function importVendorsFromFile(file: File) {
    if (!userId) return;

    setImporting(true);
    setImportResult(null);

    try {
      const XLSX = await import("xlsx");
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array" });
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

      let insertedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
        );

        const name = String(
          normalized.name || normalized.vendor_name || normalized.business_name || ""
        ).trim();

        if (!name) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Missing required vendor name.`);
          }
          continue;
        }

        const email = String(normalized.email || normalized.email_address || "").trim() || null;
        const phone = String(normalized.phone || normalized.phone_number || "").trim() || null;
        const address = String(normalized.address || "").trim() || null;

        const { data: existingVendor, error: findError } = await supabase
          .from("vendors")
          .select("id, email, phone, address")
          .eq("user_id", userId)
          .ilike("name", name)
          .maybeSingle();

        if (findError) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: ${findError.message}`);
          }
          continue;
        }

        if (existingVendor?.id) {
          const patch = {
            email: email || existingVendor.email,
            phone: phone || existingVendor.phone,
            address: address || existingVendor.address,
          };

          const { error: updateError } = await supabase
            .from("vendors")
            .update(patch)
            .eq("id", existingVendor.id);

          if (updateError) {
            failedCount += 1;
            if (errors.length < 6) {
              errors.push(`Row ${index + 2}: ${updateError.message}`);
            }
            continue;
          }

          updatedCount += 1;
          continue;
        }

        const payload = {
          user_id: userId,
          name,
          email,
          phone,
          address,
        };

        const { error } = await supabase.from("vendors").insert(payload);
        if (error) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
          continue;
        }

        insertedCount += 1;
      }

      if (insertedCount > 0 || updatedCount > 0) {
        void fetchVendors();
      }

      if (insertedCount + updatedCount > 0 && failedCount === 0) {
        setImportResult({
          severity: "success",
          message: `Imported ${insertedCount} vendors and updated ${updatedCount}.`,
        });
      } else if (insertedCount + updatedCount > 0 && failedCount > 0) {
        setImportResult({
          severity: "warning",
          message: `Imported ${insertedCount}, updated ${updatedCount}. ${failedCount} row(s) failed.`,
          details: errors,
        });
      } else {
        setImportResult({
          severity: "error",
          message: "Import failed. No vendors were added.",
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

  async function cleanupDuplicateVendors() {
    if (!userId || cleaning) return;

    const shouldContinue = window.confirm(
      "This will merge duplicate vendors by name, re-link expenses/products, and permanently delete extra duplicate rows. Continue?"
    );
    if (!shouldContinue) return;

    setCleaning(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, email, phone, address")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setImportResult({ severity: "error", message: error.message });
        return;
      }

      const allVendors = (data as VendorRow[]) || [];
      const groups = new Map<string, VendorRow[]>();

      for (const vendor of allVendors) {
        const key = vendor.name.trim().toLowerCase();
        if (!key) continue;
        const current = groups.get(key) || [];
        current.push(vendor);
        groups.set(key, current);
      }

      let mergedGroups = 0;
      let deletedRows = 0;
      let failedGroups = 0;
      const errors: string[] = [];

      for (const [key, group] of groups.entries()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort(
          (a, b) => vendorCompletenessScore(b) - vendorCompletenessScore(a)
        );
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const mergedPatch = {
          email:
            primary.email ||
            duplicates.map((v) => v.email).find(Boolean) ||
            null,
          phone:
            primary.phone ||
            duplicates.map((v) => v.phone).find(Boolean) ||
            null,
          address:
            primary.address ||
            duplicates.map((v) => v.address).find(Boolean) ||
            null,
        };

        const { error: patchError } = await supabase
          .from("vendors")
          .update(mergedPatch)
          .eq("id", primary.id);

        if (patchError) {
          failedGroups += 1;
          if (errors.length < 6) {
            errors.push(`Could not patch vendor ${primary.name}: ${patchError.message}`);
          }
          continue;
        }

        let groupFailed = false;
        for (const duplicate of duplicates) {
          const { error: expenseUpdateError } = await supabase
            .from("expenses")
            .update({ vendor_id: primary.id })
            .eq("vendor_id", duplicate.id)
            .eq("user_id", userId);

          if (expenseUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink expenses for ${duplicate.name}: ${expenseUpdateError.message}`
              );
            }
            break;
          }

          const { error: productUpdateError } = await supabase
            .from("products")
            .update({ supplier_id: primary.id })
            .eq("supplier_id", duplicate.id)
            .eq("user_id", userId);

          if (productUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink products for ${duplicate.name}: ${productUpdateError.message}`
              );
            }
            break;
          }

          const { error: deleteError } = await supabase
            .from("vendors")
            .delete()
            .eq("id", duplicate.id)
            .eq("user_id", userId);

          if (deleteError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(`Could not delete duplicate ${duplicate.name}: ${deleteError.message}`);
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

      void fetchVendors();

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
        setImportResult({
          severity: "success",
          message: "No duplicate vendors found.",
        });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Vendor cleanup failed due to an unexpected error.",
      });
    } finally {
      setCleaning(false);
    }
  }

  const filtered = useMemo(
    () => vendors.filter((v) => v.name.toLowerCase().includes(search.toLowerCase())),
    [vendors, search]
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Vendors</Typography>
          <Typography color="text.secondary">Manage your vendors and suppliers</Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void cleanupDuplicateVendors()}
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Vendor
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
              void importVendorsFromFile(file);
            }
            event.target.value = "";
          }}
        />
      </Stack>

      <TextField
        size="small"
        placeholder="Search vendors..."
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
            <Grid key={`vendor-skeleton-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={<Skeleton variant="text" width="48%" height={30} />}
                  action={
                    <Stack direction="row" spacing={0.5}>
                      <Skeleton variant="circular" width={30} height={30} />
                      <Skeleton variant="circular" width={30} height={30} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="76%" />
                    <Skeleton variant="text" width="64%" />
                    <Skeleton variant="text" width="84%" />
                    <Box pt={1}>
                      <Skeleton variant="rounded" width={72} height={24} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <StoreIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography mt={1.5} color="text.secondary">
            No vendors yet. Add your first vendor!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((vendor) => (
            <Grid key={vendor.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={vendor.name}
                  sx={{ pb: 0.5 }}
                  action={
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => openEdit(vendor)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => void openDelete(vendor.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {vendor.email || "No email"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vendor.phone || "No phone"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vendor.address || "No address"}
                    </Typography>
                    <Box pt={1}>
                      <Chip label="Vendor" size="small" variant="outlined" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField label="Business Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={() => void addVendor()}>Save Vendor</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={!!editVendor} onClose={() => setEditVendor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField label="Business Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditVendor(null)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={() => void updateVendor()}>Update Vendor</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => { setDeleteId(null); setHasExpenses(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Vendor</DialogTitle>
        <DialogContent>
          {hasExpenses ? (
            <Stack spacing={2}>
              <Typography color="error">
                This vendor has {expenseCount} expense(s) linked to them.
              </Typography>
              <Typography>
                Would you like to delete the vendor along with all their expenses? This action cannot be undone.
              </Typography>
            </Stack>
          ) : (
            <Typography>
              Are you sure you want to delete this vendor? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteId(null); setHasExpenses(false); }} color="inherit">
            Cancel
          </Button>
          {hasExpenses ? (
            <Button variant="contained" color="error" onClick={() => void deleteVendor(true)}>
              Delete Vendor & Expenses
            </Button>
          ) : (
            <Button variant="contained" color="error" onClick={() => void deleteVendor(false)}>
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}