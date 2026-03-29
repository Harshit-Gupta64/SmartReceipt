import Link from "next/link";

export default function ExpensesNotFound() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Page not found</h1>
      <p style={{ marginBottom: "1rem" }}>
        The requested expenses page could not be found.
      </p>
      <Link href="/dashboard/expenses">Back to Expenses</Link>
    </main>
  );
}
