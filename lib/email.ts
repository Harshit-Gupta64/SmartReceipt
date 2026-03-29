import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  total,
  dueDate,
}: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
}) {
  await resend.emails.send({
    from: "SmartReceipt <onboarding@resend.dev>",
    to,
    subject: `Invoice ${invoiceNumber} from SmartReceipt`,
    html: `
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Dear ${clientName},</p>
      <p>Please find your invoice details below:</p>
      <table>
        <tr><td><strong>Invoice Number:</strong></td><td>${invoiceNumber}</td></tr>
        <tr><td><strong>Amount Due:</strong></td><td>₹${total}</td></tr>
        <tr><td><strong>Due Date:</strong></td><td>${dueDate}</td></tr>
      </table>
      <p>Please make the payment before the due date.</p>
      <p>Thank you for your business!</p>
      <p><strong>SmartReceipt</strong></p>
    `,
  });
}

export async function sendPaymentConfirmationEmail({
  to,
  clientName,
  invoiceNumber,
  total,
}: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
}) {
  await resend.emails.send({
    from: "SmartReceipt <onboarding@resend.dev>",
    to,
    subject: `Payment Received for Invoice ${invoiceNumber}`,
    html: `
      <h2>Payment Confirmed ✅</h2>
      <p>Dear ${clientName},</p>
      <p>We have received your payment for invoice ${invoiceNumber}.</p>
      <p><strong>Amount Paid: ₹${total}</strong></p>
      <p>Thank you for your prompt payment!</p>
      <p><strong>SmartReceipt</strong></p>
    `,
  });
}

export async function sendExpenseVendorEmail({
  to,
  vendorName,
  title,
  amount,
  date,
}: {
  to: string;
  vendorName: string;
  title: string;
  amount: number;
  date: string;
}) {
  await resend.emails.send({
    from: "SmartReceipt <onboarding@resend.dev>",
    to,
    subject: `Payment Confirmation - ${title}`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>Dear ${vendorName},</p>
      <p>This is to confirm that we have recorded the following payment:</p>
      <table>
        <tr><td><strong>Description:</strong></td><td>${title}</td></tr>
        <tr><td><strong>Amount:</strong></td><td>₹${amount}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
      </table>
      <p>Thank you for your services!</p>
      <p><strong>SmartReceipt</strong></p>
    `,
  });
}

export async function sendLowStockAlertEmail({
  to,
  productName,
  sku,
  quantity,
}: {
  to: string;
  productName: string;
  sku: string;
  quantity: number;
}) {
  await resend.emails.send({
    from: "SmartReceipt <onboarding@resend.dev>",
    to,
    subject: `⚠️ Low Stock Alert - ${productName}`,
    html: `
      <h2>⚠️ Low Stock Alert</h2>
      <p>This is an automated alert from SmartReceipt.</p>
      <p>The following product is running low on stock:</p>
      <table>
        <tr><td><strong>Product:</strong></td><td>${productName}</td></tr>
        <tr><td><strong>SKU:</strong></td><td>${sku}</td></tr>
        <tr><td><strong>Current Quantity:</strong></td><td>${quantity} units</td></tr>
      </table>
      <p>Please restock as soon as possible!</p>
      <p><strong>SmartReceipt</strong></p>
    `,
  });
}