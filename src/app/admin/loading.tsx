export default function AdminLoading() {
  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ height: "1.5rem", width: "200px", background: "var(--color-border)", borderRadius: "var(--radius)", marginBottom: "0.5rem" }} />
      <div style={{ height: "0.875rem", width: "300px", background: "var(--color-border)", borderRadius: "var(--radius)", marginBottom: "2rem" }} />
      <div className="stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div style={{ height: "1.75rem", width: "60px", background: "var(--color-border)", borderRadius: "var(--radius)", marginBottom: "0.25rem" }} />
            <div style={{ height: "0.8rem", width: "80px", background: "var(--color-border)", borderRadius: "var(--radius)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
