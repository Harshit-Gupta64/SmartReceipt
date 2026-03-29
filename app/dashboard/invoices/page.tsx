"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
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
  Divider,
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

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string | null;
  total: number;
  subtotal: number;
  tax: number;
  notes: string | null;
  client_id: string;
  clients?: { name: string; email: string | null };
};

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
};

type ItemRow = {
  description: string;
  quantity: number;
  unit_price: number;
};

export default function InvoicesPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    due_date: "",
    notes: "",
  });
  const [form, setForm] = useState({
    client_id: "",
    invoice_number: "",
    due_date: "",
    notes: "",
  });
  const [items, setItems] = useState<ItemRow[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  const fetchInvoices = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("invoices")
      .select("*, clients(name, email)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setInvoices((data as InvoiceRow[]) || []);
    setLoading(false);
  }, [userId]);

  const fetchClients = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId);
    setClients((data as ClientRow[]) || []);
  }, [userId]);

  useEffect(() => {
    void fetchInvoices();
    void fetchClients();
  }, [fetchInvoices, fetchClients]);

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
        due_date: form.due_date || null,
        user_id: userId,
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
    void fetchInvoices();
  }

  function openEdit(invoice: InvoiceRow) {
    setEditInvoice(invoice);
    setEditForm({
      status: invoice.status,
      due_date: invoice.due_date || "",
      notes: invoice.notes || "",
    });
  }

  async function updateInvoice() {
    if (!editInvoice) return;
    await supabase
      .from("invoices")
      .update({
        ...editForm,
        due_date: editForm.due_date || null,
      })
      .eq("id", editInvoice.id);
    setEditInvoice(null);
    void fetchInvoices();
  }

  async function deleteInvoice() {
    if (!deleteId) return;
    await supabase.from("invoice_items").delete().eq("invoice_id", deleteId);
    await supabase.from("invoices").delete().eq("id", deleteId);
    setDeleteId(null);
    void fetchInvoices();
  }

  async function markPaid(invoice: InvoiceRow) {
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoice.id);
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
    void fetchInvoices();
  }

  function getStatusColor(
    status: string
  ): "success" | "error" | "warning" | "default" {
    if (status === "paid") return "success";
    if (status === "overdue") return "error";
    return "warning";
  }

  const filtered = useMemo(
    () =>
      invoices.filter((inv) =>
        inv.invoice_number.toLowerCase().includes(search.toLowerCase())
      ),
    [invoices, search]
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4">Invoices</Typography>
          <Typography color="text.secondary">
            Create and track your invoices
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          New Invoice
        </Button>
      </Stack>

      <TextField
        size="small"
        placeholder="Search invoices..."
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
            <Grid key={`invoice-skeleton-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={<Skeleton variant="text" width="52%" height={30} />}
                  action={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Skeleton variant="rounded" width={56} height={24} />
                      <Skeleton variant="circular" width={30} height={30} />
                      <Skeleton variant="circular" width={30} height={30} />
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="74%" />
                    <Skeleton variant="text" width="64%" />
                    <Skeleton variant="text" width="44%" height={34} />
                    <Box pt={1}>
                      <Skeleton variant="rounded" width={92} height={32} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <DescriptionIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography mt={1.5} color="text.secondary">
            No invoices yet. Create your first invoice!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((invoice) => (
            <Grid key={invoice.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={invoice.invoice_number}
                  sx={{ pb: 0.5 }}
                  action={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={invoice.status}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => openEdit(invoice)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(invoice.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Client: {invoice.clients?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Due: {invoice.due_date || "No due date"}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      ₹{invoice.total?.toFixed(2)}
                    </Typography>
                   {invoice.notes && (
                        <Typography variant="body2" color="text.secondary">
                          📝 {invoice.notes}
                        </Typography>
                      )}
                      {invoice.status !== "paid" && (
                        <Box pt={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => void markPaid(invoice)}
                          >
                            Mark Paid
                          </Button>
                        </Box>
                      )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Invoice Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Select
              value={form.client_id}
              onChange={(e) =>
                setForm({ ...form, client_id: e.target.value })
              }
              displayEmpty
              size="small"
            >
              <MenuItem value="">Select Client *</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Invoice Number *"
              placeholder="e.g. INV-001"
              value={form.invoice_number}
              onChange={(e) =>
                setForm({ ...form, invoice_number: e.target.value })
              }
              size="small"
            />
            <TextField
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) =>
                setForm({ ...form, due_date: e.target.value })
              }
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <Typography variant="subtitle2">Items</Typography>
            {items.map((item, index) => (
              <Stack key={index} direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  size="small"
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Qty"
                  type="number"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateItem(index, "quantity", Number(e.target.value))
                  }
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Unit Price"
                  type="number"
                  value={item.unit_price || ""}
                  onChange={(e) =>
                    updateItem(index, "unit_price", Number(e.target.value))
                  }
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="error"
                  onClick={() =>
                    setItems(items.filter((_, i) => i !== index))
                  }
                  disabled={items.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button variant="outlined" onClick={addItem}>
              + Add Item
            </Button>

            <Divider />
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Subtotal</Typography>
                <Typography variant="body2">₹{subtotal.toFixed(2)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">GST (18%)</Typography>
                <Typography variant="body2">₹{tax.toFixed(2)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight="bold">
                  Total
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  ₹{total.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>

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
          <Button
            variant="contained"
            onClick={() => void createInvoice()}
          >
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog
        open={!!editInvoice}
        onClose={() => setEditInvoice(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Select
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value })
              }
              size="small"
            >
              <MenuItem value="unpaid">Unpaid</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </Select>
            <TextField
              label="Due Date"
              type="date"
              value={editForm.due_date}
              onChange={(e) =>
                setEditForm({ ...editForm, due_date: e.target.value })
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
          <Button onClick={() => setEditInvoice(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void updateInvoice()}
          >
            Update Invoice
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
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this invoice? This will also
            delete all invoice items. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void deleteInvoice()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}