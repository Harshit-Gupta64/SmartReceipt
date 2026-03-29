"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Receipt,
  Package,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const [revenue, setRevenue] = useState(0);
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    // Revenue from paid invoices
    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("total")
      .eq("user_id", user?.id)
      .eq("status", "paid");
    setRevenue(paidInvoices?.reduce((sum, inv) => sum + inv.total, 0) || 0);

    // Unpaid invoices count
    const { data: unpaid } = await supabase
      .from("invoices")
      .select("id")
      .eq("user_id", user?.id)
      .eq("status", "unpaid");
    setUnpaidInvoices(unpaid?.length || 0);

    // Total expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user?.id);
    setTotalExpenses(expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0);

    // Products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user?.id);
    setTotalProducts(products?.length || 0);
    setLowStockCount(
      products?.filter((p) => p.quantity <= p.reorder_point).length || 0
    );
    setTopProducts(products?.slice(0, 5) || []);
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to SmartReceipt — your business at a glance.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Product Stock Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{product.sku}</span>
                  <span className="font-medium">{product.name}</span>
                  <span
                    className={
                      product.quantity <= product.reorder_point
                        ? "text-red-500 font-bold"
                        : "text-green-600 font-bold"
                    }
                  >
                    {product.quantity} units
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}