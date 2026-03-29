"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import StoreIcon from "@mui/icons-material/Store";
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

type VendorRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export default function VendorsPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
    setVendors((data as VendorRow[]) || []);
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Vendor
        </Button>
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