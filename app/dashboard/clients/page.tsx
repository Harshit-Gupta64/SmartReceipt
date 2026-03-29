"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ClientRow = {
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

function clientCompletenessScore(client: ClientRow): number {
  return [client.email, client.phone, client.address].filter(Boolean).length;
}

function dedupeClientsByName(rows: ClientRow[]): ClientRow[] {
  const byName = new Map<string, ClientRow>();

  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;

    const existing = byName.get(key);
    if (!existing || clientCompletenessScore(row) > clientCompletenessScore(existing)) {
      byName.set(key, row);
    }
  }

  return Array.from(byName.values());
}

export default function ClientsPage() {
  const { user } = useUser();
  const userId = user?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [open, setOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchClients = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const typedClients = (data as ClientRow[]) || [];
    setClients(dedupeClientsByName(typedClients));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  async function addClient() {
    if (!form.name) return;
    await supabase.from("clients").insert({
      ...form,
      user_id: userId,
    });
    setForm({ name: "", email: "", phone: "", address: "" });
    setOpen(false);
    void fetchClients();
  }

  async function updateClient() {
    if (!editClient || !form.name) return;
    await supabase
      .from("clients")
      .update({ ...form })
      .eq("id", editClient.id);
    setEditClient(null);
    setForm({ name: "", email: "", phone: "", address: "" });
    void fetchClients();
  }

async function deleteClient() {
  if (!deleteId) return;
  
  // Check if client has invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("client_id", deleteId);

  if (invoices && invoices.length > 0) {
    setDeleteId(null);
    alert(`Cannot delete this client. They have ${invoices.length} invoice(s) linked to them. Please delete the invoices first.`);
    return;
  }

  const { error } = await supabase.from("clients").delete().eq("id", deleteId);
  if (error) {
    console.error("Delete error:", error);
    return;
  }
  setDeleteId(null);
  void fetchClients();
}

  function openEdit(client: ClientRow) {
    setEditClient(client);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
    });
  }

  async function importClientsFromFile(file: File) {
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
          normalized.name || normalized.client_name || normalized.full_name || ""
        ).trim();

        if (!name) {
          failedCount += 1;
          if (errors.length < 6) {
            errors.push(`Row ${index + 2}: Missing required client name.`);
          }
          continue;
        }

        const email = String(normalized.email || normalized.email_address || "").trim() || null;
        const phone = String(normalized.phone || normalized.phone_number || "").trim() || null;
        const address = String(normalized.address || "").trim() || null;

        const { data: existingClient, error: findError } = await supabase
          .from("clients")
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

        if (existingClient?.id) {
          const patch = {
            email: email || existingClient.email,
            phone: phone || existingClient.phone,
            address: address || existingClient.address,
          };

          const { error: updateError } = await supabase
            .from("clients")
            .update(patch)
            .eq("id", existingClient.id);

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

        const { error } = await supabase.from("clients").insert(payload);
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
        void fetchClients();
      }

      if (insertedCount + updatedCount > 0 && failedCount === 0) {
        setImportResult({
          severity: "success",
          message: `Imported ${insertedCount} clients and updated ${updatedCount}.`,
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
          message: "Import failed. No clients were added.",
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

  async function cleanupDuplicateClients() {
    if (!userId || cleaning) return;

    const shouldContinue = window.confirm(
      "This will merge duplicate clients by name, re-link invoices, and permanently delete extra duplicate rows. Continue?"
    );
    if (!shouldContinue) return;

    setCleaning(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, address")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setImportResult({ severity: "error", message: error.message });
        return;
      }

      const allClients = (data as ClientRow[]) || [];
      const groups = new Map<string, ClientRow[]>();

      for (const client of allClients) {
        const key = client.name.trim().toLowerCase();
        if (!key) continue;
        const current = groups.get(key) || [];
        current.push(client);
        groups.set(key, current);
      }

      let mergedGroups = 0;
      let deletedRows = 0;
      let failedGroups = 0;
      const errors: string[] = [];

      for (const group of groups.values()) {
        if (group.length < 2) continue;

        const sorted = [...group].sort(
          (a, b) => clientCompletenessScore(b) - clientCompletenessScore(a)
        );
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const mergedPatch = {
          email:
            primary.email ||
            duplicates.map((c) => c.email).find(Boolean) ||
            null,
          phone:
            primary.phone ||
            duplicates.map((c) => c.phone).find(Boolean) ||
            null,
          address:
            primary.address ||
            duplicates.map((c) => c.address).find(Boolean) ||
            null,
        };

        const { error: patchError } = await supabase
          .from("clients")
          .update(mergedPatch)
          .eq("id", primary.id);

        if (patchError) {
          failedGroups += 1;
          if (errors.length < 6) {
            errors.push(`Could not patch client ${primary.name}: ${patchError.message}`);
          }
          continue;
        }

        let groupFailed = false;
        for (const duplicate of duplicates) {
          const { error: invoiceUpdateError } = await supabase
            .from("invoices")
            .update({ client_id: primary.id })
            .eq("client_id", duplicate.id)
            .eq("user_id", userId);

          if (invoiceUpdateError) {
            groupFailed = true;
            if (errors.length < 6) {
              errors.push(
                `Could not relink invoices for ${duplicate.name}: ${invoiceUpdateError.message}`
              );
            }
            break;
          }

          const { error: deleteError } = await supabase
            .from("clients")
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

      void fetchClients();

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
          message: "No duplicate clients found.",
        });
      }
    } catch {
      setImportResult({
        severity: "error",
        message: "Client cleanup failed due to an unexpected error.",
      });
    } finally {
      setCleaning(false);
    }
  }

  const filtered = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Clients</Typography>
          <Typography color="text.secondary">Manage your clients</Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void cleanupDuplicateClients()}
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
            Add Client
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
              void importClientsFromFile(file);
            }
            event.target.value = "";
          }}
        />
      </Stack>

      <TextField
        size="small"
        placeholder="Search clients..."
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
            <Grid key={`client-skeleton-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
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
                      <Skeleton variant="rounded" width={70} height={24} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <GroupIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography mt={1.5} color="text.secondary">
            No clients yet. Add your first client!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((client) => (
            <Grid key={client.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardHeader
                  title={client.name}
                  sx={{ pb: 0.5 }}
                  action={
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => openEdit(client)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(client.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {client.email || "No email"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {client.phone || "No phone"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {client.address || "No address"}
                    </Typography>
                    <Box pt={1}>
                      <Chip label="Client" size="small" variant="outlined" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Client Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              label="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void addClient()}>
            Save Client
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onClose={() => setEditClient(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              label="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditClient(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void updateClient()}>
            Update Client
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this client? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={() => void deleteClient()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}