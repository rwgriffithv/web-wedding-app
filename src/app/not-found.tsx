import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>404</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>This page could not be found.</p>
      <Link href="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
