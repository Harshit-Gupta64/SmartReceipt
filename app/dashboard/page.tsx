"use client";

import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Receipt,
  Package,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorder_point: number;
};

type InvoiceTotalRow = {
  total: number;
};

type ExpenseRow = {
  amount: number;
};

export default function DashboardPage() {
  const { user } = useUser();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);

  const [revenue, setRevenue] = useState(0);
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductRow[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("total")
      .eq("user_id", userId)
      .eq("status", "paid");

    const paidInvoiceRows = (paidInvoices as InvoiceTotalRow[] | null) || [];
    setRevenue(
      paidInvoiceRows.reduce((sum, invoice) => sum + Number(invoice.total), 0)
    );

    const { data: unpaid } = await supabase
      .from("invoices")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "unpaid");
    setUnpaidInvoices(unpaid?.length || 0);

    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId);

    const expenseRows = (expenses as ExpenseRow[] | null) || [];
    setTotalExpenses(
      expenseRows.reduce((sum, expense) => sum + Number(expense.amount), 0)
    );

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId);

    const typedProducts = (products as ProductRow[] | null) || [];
    setTotalProducts(typedProducts.length);
    setLowStockCount(
      typedProducts.filter(
        (product) => product.quantity <= product.reorder_point
      ).length
    );
    setTopProducts(typedProducts.slice(0, 5));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const profitLoss = revenue - totalExpenses;

  const stats = [
    {
      title: "Total Revenue",
      value: `₹${revenue.toFixed(2)}`,
      icon: FileText,
      description: "From paid invoices",
    },
    {
      title: "Unpaid Invoices",
      value: unpaidInvoices,
      icon: Receipt,
      description: "Awaiting payment",
    },
    {
      title: "Total Products",
      value: totalProducts,
      icon: Package,
      description: "In your inventory",
    },
    {
      title: "Low Stock Alerts",
      value: lowStockCount,
      icon: AlertTriangle,
      description: "Products need restock",
    },
    {
      title: "Profit / Loss",
      value: `₹${profitLoss.toFixed(2)}`,
      icon: TrendingUp,
      description: profitLoss >= 0 ? "You are in profit 🟢" : "You are in loss 🔴",
    },
  ];

  // Skeleton loading state
  if (loading) {
    return (
      <Stack spacing={3}>
        <Box>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={320} height={24} />
        </Box>

        {/* Stat card skeletons */}
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="80%" height={36} sx={{ my: 0.5 }} />
                  <Skeleton variant="text" width="50%" height={16} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Stock overview skeleton */}
        <Card>
          <CardContent>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 1fr",
                    gap: 1,
                    alignItems: "center",
                    p: 1,
                  }}
                >
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to SmartReceipt, your business at a glance.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <stat.icon size={18} />
                </Stack>
                <Typography variant="h6" fontWeight={700}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Product Stock Overview
          </Typography>
          {topProducts.length === 0 ? (
            <Alert severity="info">No products yet.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {topProducts.map((product) => (
                <Box
                  key={product.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 1fr",
                    gap: 1,
                    alignItems: "center",
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {product.sku}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {product.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={
                      product.quantity <= product.reorder_point
                        ? "error.main"
                        : "success.main"
                    }
                    textAlign="right"
                  >
                    {product.quantity} units
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}