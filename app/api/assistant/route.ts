import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { question, userId } = await req.json();

  const [invoices, expenses, products, clients] = await Promise.all([
    supabase.from("invoices").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("products").select("*").eq("user_id", userId),
    supabase.from("clients").select("*").eq("user_id", userId),
  ]);

  const totalRevenue =
    invoices.data
      ?.filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0) || 0;

  const totalExpenses =
    expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  const lowStockProducts = products.data?.filter(
    (p) => p.quantity <= p.reorder_point
  );

  const businessSummary = `
    Business Data Summary:
    - Total Clients: ${clients.data?.length || 0}
    - Total Invoices: ${invoices.data?.length || 0}
    - Paid Revenue: ₹${totalRevenue}
    - Unpaid Invoices: ${invoices.data?.filter((inv) => inv.status === "unpaid").length || 0}
    - Total Expenses: ₹${totalExpenses}
    - Profit/Loss: ₹${totalRevenue - totalExpenses}
    - Total Products: ${products.data?.length || 0}
    - Low Stock Products: ${lowStockProducts?.map((p) => p.name).join(", ") || "None"}
    - Recent Expenses: ${expenses.data?.slice(0, 3).map((e) => `${e.title}: ₹${e.amount}`).join(", ") || "None"}
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `You are a helpful business assistant for SmartReceipt. Here is the current business data:\n\n${businessSummary}\n\nUser question: ${question}\n\nReturn a concise, helpful answer in clean Markdown only. Use headings, bullets, and short sections where useful. Do not include internal/tooling tokens (for example: #codebase), XML tags, or fenced code blocks unless the user explicitly asks for code.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  const cleanResponse = response
    .replace(/#codebase\b/gi, "")
    .replace(/<\/?artifact[^>]*>/gi, "")
    .trim();

  return NextResponse.json({ answer: cleanResponse });
}