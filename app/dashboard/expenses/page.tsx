"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptIcon from "@mui/icons-material/Receipt";
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

export default function ExpensesPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add Expense
        </Button>
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