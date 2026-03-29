"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptIcon from "@mui/icons-material/Receipt";
import SearchIcon from "@mui/icons-material/Search";
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

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Inventory Purchase",
  "Marketing",
  "Travel",
  "Miscellaneous",
];

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string | null;
  notes: string | null;
  vendor_id: string | null;
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

function expenseCompletenessScore(expense: ExpenseRow): number {
  return [
    expense.vendor_id,
    expense.notes,
    expense.expense_date,
    expense.category,
  ].filter(Boolean).length;
}

export default function ExpensesPage() {
  const { user } = useUser();
  const userId = user?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    category: "",
    expense_date: "",
    vendor_id: "",
    notes: "",
  });
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    expense_date: "",
    vendor_id: "",
    notes: "",
  });

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("expenses")
      .select("*, vendors(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setExpenses((data as ExpenseRow[]) || []);
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
    void fetchExpenses();
    void fetchVendors();
  }, [fetchExpenses, fetchVendors]);

  async function addExpense() {
    if (!form.title || !form.amount || !form.category) return;
    await supabase.from("expenses").insert({
      ...form,
      amount: Number(form.amount),
      user_id: userId,
      expense_date: form.expense_date || null,
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
    void fetchExpenses();
  }

  function openEdit(expense: ExpenseRow) {
    setEditExpense(expense);
    setEditForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      expense_date: expense.expense_date || "",
      vendor_id: expense.vendor_id || "",
      notes: expense.notes || "",
    });
  }

  async function updateExpense() {
    if (!editExpense) return;
    await supabase
      .from("expenses")
      .update({
        ...editForm,
        amount: Number(editForm.amount),
        expense_date: editForm.expense_date || null,
        vendor_id: editForm.vendor_id || null,
      })
      .eq("id", editExpense.id);
    setEditExpense(null);
    void fetchExpenses();
  }

  async function deleteExpense() {
    if (!deleteId) return;
    await supabase.from("expenses").delete().eq("id", deleteId);
    setDeleteId(null);
    void fetchExpenses();
  }

  async function importExpensesFromFile(file: File) {
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

      const findOrCreateVendorId = async (rawVendorName: unknown) => {
        const vendorName = String(rawVendorName || "").trim();
        if (!vendorName) return null;

        const key = vendorName.toLowerCase();
        const cachedId = vendorByName.get(key);
        if (cachedId) return cachedId;

        const { data: existingVendor } = await supabase
          .from("vendors")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", vendorName)
          .maybeSingle();

        if (existingVendor?.id) {
          vendorByName.set(key, existingVendor.id);
          return existingVendor.id;
        }

        const { data: createdVendor, error: createVendorError } = await supabase
          .from("vendors")
          .insert({
            user_id: userId,
            name: vendorName,
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
      let failedCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
        );

        const title = String(
          normalized.title || normalized.expense_title || normalized.name || ""
        ).trim();
        const amount = parseNumber(normalized.amount ?? normalized.value);
        const rawCategory = String(
          normalized.category || normalized.expense_category || ""
        ).trim();
        const category = rawCategory || "Miscellaneous";

        if (!title || amount <= 0) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Missing title or invalid amount.`);
          }
          continue;
        }

        const vendorText = String(
          normalized.vendor || normalized.vendor_name || normalized.supplier || ""
        ).trim();
        const vendorId = await findOrCreateVendorId(vendorText);

        const payload = {
          user_id: userId,
          title,
          amount,
          category,
          expense_date: parseDate(
            normalized.expense_date ?? normalized.date ?? normalized.expensedate
          ),
          vendor_id: vendorId,
          notes: String(normalized.notes || normalized.note || "").trim() || null,
        };

        let existingExpenseQuery = supabase
          .from("expenses")
          .select("id, title, amount, category, expense_date, notes, vendor_id")
          .eq("user_id", userId)
          .ilike("title", title)
          .eq("amount", amount);

        existingExpenseQuery = payload.expense_date
          ? existingExpenseQuery.eq("expense_date", payload.expense_date)
          : existingExpenseQuery.is("expense_date", null);

        existingExpenseQuery = payload.vendor_id
          ? existingExpenseQuery.eq("vendor_id", payload.vendor_id)
          : existingExpenseQuery.is("vendor_id", null);

        const { data: existingExpense, error: findError } = await existingExpenseQuery
          .limit(1)
          .maybeSingle();

        if (findError) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: ${findError.message}`);
          }
          continue;
        }

        if (existingExpense?.id) {
          const { error: updateError } = await supabase
            .from("expenses")
            .update({
              title: payload.title,
              amount: payload.amount,
              category: payload.category || existingExpense.category,
              expense_date: payload.expense_date,
              vendor_id: payload.vendor_id,
              notes: payload.notes || existingExpense.notes,
            })
            .eq("id", existingExpense.id)
            .eq("user_id", userId);

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

        const { error } = await supabase.from("expenses").insert(payload);
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
        void fetchExpenses();
      }

      if (insertedCount + updatedCount > 0 && failedCount === 0) {
        setImportResult({
          severity: "success",
          message: `Imported ${insertedCount} expenses and updated ${updatedCount}.`,
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
          message: "Import failed. No expenses were added.",
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

  async function cleanupDuplicateExpenses() {
    if (!userId || cleaning) return;

    const shouldContinue = window.confirm(
      "This will merge duplicate expenses and permanently delete extra duplicate rows. Continue?"
    );
    if (!shouldContinue) return;

    setCleaning(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, title, amount, category, expense_date, notes, vendor_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setImportResult({ severity: "error", message: error.message });
        return;
      }

      const allExpenses = (data as ExpenseRow[]) || [];
      const groups = new Map<string, ExpenseRow[]>();

      for (const expense of allExpenses) {
        const key = [
          expense.title.trim().toLowerCase(),
          Number(expense.amount).toFixed(2),
          expense.expense_date || "",
          expense.vendor_id || "",
        ].join("|");
        if (!key) continue;
        const current = groups.get(key) || [];
        current.push(expense);
        groups.set(key, current);
      }

      let mergedGroups = 0;
      let deletedRows = 0;
      let failedGroups = 0;
      const errors: string[] = [];

      for (const group of groups.values()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort(
          (a, b) => expenseCompletenessScore(b) - expenseCompletenessScore(a)
        );
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const mergedPatch = {
          category: primary.category || duplicates.map((e) => e.category).find(Boolean) || "Miscellaneous",
          expense_date:
            primary.expense_date || duplicates.map((e) => e.expense_date).find(Boolean) || null,
          vendor_id: primary.vendor_id || duplicates.map((e) => e.vendor_id).find(Boolean) || null,
          notes: primary.notes || duplicates.map((e) => e.notes).find(Boolean) || null,
        };

        const { error: patchError } = await supabase
          .from("expenses")
          .update(mergedPatch)
          .eq("id", primary.id)
          .eq("user_id", userId);

        if (patchError) {
          failedGroups += 1;
          if (errors.length < 6) {
            errors.push(`Could not patch expense ${primary.title}: ${patchError.message}`);
          }
          continue;
        }

        let groupFailed = false;
        for (const duplicate of duplicates) {
          const { error: deleteError } = await supabase
            .from("expenses")
            .delete()
            .eq("id", duplicate.id)
            .eq("user_id", userId);

          if (deleteError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(`Could not delete duplicate ${duplicate.title}: ${deleteError.message}`);
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

      void fetchExpenses();

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
        setImportResult({ severity: "success", message: "No duplicate expenses found." });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Expense cleanup failed due to an unexpected error.",
      });
    } finally {
      setCleaning(false);
    }
  }

  const filtered = useMemo(
    () =>
      expenses.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase())
      ),
    [expenses, search]
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4">Expenses</Typography>
          <Typography color="text.secondary">
            Track your business expenses
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void cleanupDuplicateExpenses()}
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
            onClick={() => setOpen(true)}
          >
            Add Expense
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
              void importExpensesFromFile(file);
            }
            event.target.value = "";
          }}
        />
      </Stack>

      {/* Total Expenses Card */}
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Total Expenses
          </Typography>
          <Typography variant="h4" fontWeight="bold" mt={0.5}>
            ₹{totalExpenses.toFixed(2)}
          </Typography>
        </CardContent>
      </Card>

      <TextField
        size="small"
        placeholder="Search expenses..."
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
            <Grid key={`expense-skeleton-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={<Skeleton variant="text" width="42%" height={30} />}
                  action={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Skeleton variant="rounded" width={80} height={24} />
                      <Skeleton variant="circular" width={30} height={30} />
                      <Skeleton variant="circular" width={30} height={30} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="42%" height={34} />
                    <Skeleton variant="text" width="72%" />
                    <Skeleton variant="text" width="62%" />
                    <Skeleton variant="text" width="80%" />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <ReceiptIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography mt={1.5} color="text.secondary">
            No expenses yet. Add your first expense!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((expense) => (
            <Grid key={expense.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={expense.title}
                  sx={{ pb: 0.5 }}
                  action={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={expense.category}
                        size="small"
                        variant="outlined"
                      />
                      <IconButton
                        size="small"
                        onClick={() => openEdit(expense)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight="bold">
                      ₹{Number(expense.amount).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor: {expense.vendors?.name || "No vendor"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {expense.expense_date || "No date"}
                    </Typography>
                    {expense.notes && (
                      <Typography variant="body2" color="text.secondary">
                        📝 {expense.notes}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Expense Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Expense Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              size="small"
            />
            <TextField
              label="Amount (₹) *"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              size="small"
            />
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Category *</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
            <Select
              value={form.vendor_id}
              onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Vendor (optional)</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Date"
              type="date"
              value={form.expense_date}
              onChange={(e) =>
                setForm({ ...form, expense_date: e.target.value })
              }
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void addExpense()}>
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Expense Title *"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
              size="small"
            />
            <TextField
              label="Amount (₹) *"
              type="number"
              value={editForm.amount}
              onChange={(e) =>
                setEditForm({ ...editForm, amount: e.target.value })
              }
              size="small"
            />
            <Select
              value={editForm.category}
              onChange={(e) =>
                setEditForm({ ...editForm, category: e.target.value })
              }
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Category *</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
            <Select
              value={editForm.vendor_id}
              onChange={(e) =>
                setEditForm({ ...editForm, vendor_id: e.target.value })
              }
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Vendor (optional)</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Date"
              type="date"
              value={editForm.expense_date}
              onChange={(e) =>
                setEditForm({ ...editForm, expense_date: e.target.value })
              }
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes (optional)"
              value={editForm.notes}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditExpense(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void updateExpense()}>
            Update Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Expense</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this expense? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void deleteExpense()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}