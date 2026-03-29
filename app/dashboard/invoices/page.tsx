"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type ImportResult = {
  severity: "success" | "warning" | "error";
  message: string;
  details?: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function invoiceCompletenessScore(invoice: InvoiceRow): number {
  const statusRank = invoice.status === "paid" ? 2 : invoice.status === "overdue" ? 1 : 0;
  return [invoice.notes, invoice.due_date, invoice.client_id].filter(Boolean).length + statusRank;
}

export default function InvoicesPage() {
  const { user } = useUser();
  const userId = user?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
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

  async function importInvoicesFromFile(file: File) {
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

      const clientsByName = new Map(
        clients.map((client) => [client.name.toLowerCase().trim(), client.id])
      );

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

      const findOrCreateClientId = async (rawName: unknown) => {
        const clientName = String(rawName || "").trim();
        if (!clientName) return null;

        const key = clientName.toLowerCase();
        const cachedId = clientsByName.get(key);
        if (cachedId) return cachedId;

        const { data: existingClient } = await supabase
          .from("clients")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", clientName)
          .maybeSingle();

        if (existingClient?.id) {
          clientsByName.set(key, existingClient.id);
          return existingClient.id;
        }

        const { data: createdClient, error: createClientError } = await supabase
          .from("clients")
          .insert({
            user_id: userId,
            name: clientName,
          })
          .select("id, name")
          .single();

        if (!createClientError && createdClient?.id) {
          clientsByName.set(key, createdClient.id);
          return createdClient.id;
        }

        return null;
      };

      let insertedCount = 0;
      let updatedCount = 0;
      let adjustedNumberCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const isInvoiceNumberDuplicateError = (message?: string) =>
        (message || "").toLowerCase().includes("invoices_invoice_number_key") ||
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

        const invoiceNumberRaw = String(
          normalized.invoice_number || normalized.invoice || normalized.invoice_no || ""
        ).trim();
        const clientName = String(
          normalized.client || normalized.client_name || normalized.customer || ""
        ).trim();

        const total = parseNumber(normalized.total ?? normalized.amount ?? normalized.invoice_total);
        if (!clientName || total <= 0) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Missing client or invalid total amount.`);
          }
          continue;
        }

        const clientId = await findOrCreateClientId(clientName);
        if (!clientId) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Could not resolve client \"${clientName}\".`);
          }
          continue;
        }

        const subtotalValue = parseNumber(normalized.subtotal, total);
        const taxValue = parseNumber(normalized.tax, Math.max(total - subtotalValue, 0));
        const status = String(normalized.status || "unpaid").trim().toLowerCase() || "unpaid";

        const baseInvoiceNumber =
          invoiceNumberRaw || `INV-${Date.now()}-${String(index + 1).padStart(3, "0")}`;

        const payload = {
          user_id: userId,
          client_id: clientId,
          invoice_number: baseInvoiceNumber,
          due_date: parseDate(normalized.due_date ?? normalized.due ?? normalized.duedate),
          notes: String(normalized.notes || normalized.note || "").trim() || null,
          subtotal: subtotalValue,
          tax: taxValue,
          total,
          status: status === "paid" || status === "overdue" ? status : "unpaid",
        };

        const { data: existingInvoice, error: findError } = await supabase
          .from("invoices")
          .select("id")
          .eq("user_id", userId)
          .ilike("invoice_number", payload.invoice_number)
          .limit(1)
          .maybeSingle();

        if (findError) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: ${findError.message}`);
          }
          continue;
        }

        if (existingInvoice?.id) {
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              client_id: payload.client_id,
              due_date: payload.due_date,
              notes: payload.notes,
              subtotal: payload.subtotal,
              tax: payload.tax,
              total: payload.total,
              status: payload.status,
            })
            .eq("id", existingInvoice.id)
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

        const { error } = await supabase.from("invoices").insert(payload);
        if (!error) {
          insertedCount += 1;
          continue;
        }

        if (isInvoiceNumberDuplicateError(error.message)) {
          const { data: existingOwnedInvoice } = await supabase
            .from("invoices")
            .select("id")
            .eq("user_id", userId)
            .eq("invoice_number", payload.invoice_number)
            .maybeSingle();

          if (existingOwnedInvoice?.id) {
            const { error: updateError } = await supabase
              .from("invoices")
              .update({
                client_id: payload.client_id,
                due_date: payload.due_date,
                notes: payload.notes,
                subtotal: payload.subtotal,
                tax: payload.tax,
                total: payload.total,
                status: payload.status,
              })
              .eq("id", existingOwnedInvoice.id)
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
            const adjustedInvoiceNumber =
              attempt === 0
                ? `${baseInvoiceNumber}-${userSuffix}`
                : `${baseInvoiceNumber}-${userSuffix}-${attempt + 1}`;

            const { error: adjustedInsertError } = await supabase
              .from("invoices")
              .insert({ ...payload, invoice_number: adjustedInvoiceNumber });

            if (!adjustedInsertError) {
              adjustedNumberCount += 1;
              adjustedSuccessfully = true;
              if (errors.length < 6) {
                errors.push(
                  `Row ${index + 2}: Invoice ${baseInvoiceNumber} exists globally, imported as ${adjustedInvoiceNumber}.`
                );
              }
              break;
            }

            if (!isInvoiceNumberDuplicateError(adjustedInsertError.message)) {
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

      if (insertedCount > 0 || updatedCount > 0 || adjustedNumberCount > 0) {
        void fetchInvoices();
        void fetchClients();
      }

      if (insertedCount + updatedCount + adjustedNumberCount > 0 && failedCount === 0) {
        setImportResult({
          severity: "success",
          message: `Imported ${insertedCount}, updated ${updatedCount}, adjusted invoice number ${adjustedNumberCount}.`,
        });
      } else if (insertedCount + updatedCount + adjustedNumberCount > 0 && failedCount > 0) {
        setImportResult({
          severity: "warning",
          message: `Imported ${insertedCount}, updated ${updatedCount}, adjusted invoice number ${adjustedNumberCount}. ${failedCount} row(s) failed.`,
          details: errors,
        });
      } else {
        setImportResult({
          severity: "error",
          message: "Import failed. No invoices were added.",
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

  async function cleanupDuplicateInvoices() {
    if (!userId || cleaning) return;

    const shouldContinue = window.confirm(
      "This will merge duplicate invoices by invoice number, relink invoice items, and permanently delete extra duplicate invoice rows. Continue?"
    );
    if (!shouldContinue) return;

    setCleaning(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, due_date, total, subtotal, tax, notes, client_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setImportResult({ severity: "error", message: error.message });
        return;
      }

      const allInvoices = (data as InvoiceRow[]) || [];
      const groups = new Map<string, InvoiceRow[]>();

      for (const invoice of allInvoices) {
        const key = invoice.invoice_number.trim().toLowerCase();
        if (!key) continue;
        const current = groups.get(key) || [];
        current.push(invoice);
        groups.set(key, current);
      }

      let mergedGroups = 0;
      let deletedRows = 0;
      let failedGroups = 0;
      const errors: string[] = [];

      for (const group of groups.values()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort(
          (a, b) => invoiceCompletenessScore(b) - invoiceCompletenessScore(a)
        );
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const mergedPatch = {
          status:
            primary.status === "paid"
              ? "paid"
              : duplicates.some((inv) => inv.status === "paid")
                ? "paid"
                : primary.status,
          due_date: primary.due_date || duplicates.map((inv) => inv.due_date).find(Boolean) || null,
          notes: primary.notes || duplicates.map((inv) => inv.notes).find(Boolean) || null,
          subtotal:
            primary.subtotal > 0
              ? primary.subtotal
              : duplicates.map((inv) => inv.subtotal).find((value) => value > 0) || 0,
          tax:
            primary.tax > 0
              ? primary.tax
              : duplicates.map((inv) => inv.tax).find((value) => value > 0) || 0,
          total:
            primary.total > 0
              ? primary.total
              : duplicates.map((inv) => inv.total).find((value) => value > 0) || 0,
          client_id: primary.client_id || duplicates.map((inv) => inv.client_id).find(Boolean) || null,
        };

        const { error: patchError } = await supabase
          .from("invoices")
          .update(mergedPatch)
          .eq("id", primary.id)
          .eq("user_id", userId);

        if (patchError) {
          failedGroups += 1;
          if (errors.length < 6) {
            errors.push(`Could not patch invoice ${primary.invoice_number}: ${patchError.message}`);
          }
          continue;
        }

        let groupFailed = false;
        for (const duplicate of duplicates) {
          const { error: itemsUpdateError } = await supabase
            .from("invoice_items")
            .update({ invoice_id: primary.id })
            .eq("invoice_id", duplicate.id);

          if (itemsUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink invoice items for ${duplicate.invoice_number}: ${itemsUpdateError.message}`
              );
            }
            break;
          }

          const { error: deleteError } = await supabase
            .from("invoices")
            .delete()
            .eq("id", duplicate.id)
            .eq("user_id", userId);

          if (deleteError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not delete duplicate ${duplicate.invoice_number}: ${deleteError.message}`
              );
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

      void fetchInvoices();

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
        setImportResult({ severity: "success", message: "No duplicate invoices found." });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Invoice cleanup failed due to an unexpected error.",
      });
    } finally {
      setCleaning(false);
    }
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
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void cleanupDuplicateInvoices()}
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
            New Invoice
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
              void importInvoicesFromFile(file);
            }
            event.target.value = "";
          }}
        />
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