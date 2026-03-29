"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export default function ClientsPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
    setClients((data as ClientRow[]) || []);
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Client
        </Button>
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