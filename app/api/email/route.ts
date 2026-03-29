import { NextRequest, NextResponse } from "next/server";
import {
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendExpenseVendorEmail,
  sendLowStockAlertEmail,
} from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body;

  try {
    if (type === "invoice_created") {
      await sendInvoiceEmail(body);
    } else if (type === "payment_confirmed") {
      await sendPaymentConfirmationEmail(body);
    } else if (type === "expense_vendor") {
      await sendExpenseVendorEmail(body);
    } else if (type === "low_stock") {
      await sendLowStockAlertEmail(body);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}