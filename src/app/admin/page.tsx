import { Header } from "@/components/header";
import { getDashboardCounts, getRecentResponses } from "@/lib/repository/rsvp";

export default function AdminDashboardPage() {
  const counts = getDashboardCounts();
  const responses = getRecentResponses(10);

  return (
    <>
      <Header title="Dashboard" description="Overview of your wedding website." />
      <div className="stat-rows">
        {(["invited", "expected", "confirmed"] as const).map(key => (
          <div key={key}>
            <h3 className="stat-row-title">{key === "invited" ? "Invited" : key === "expected" ? "Expected" : "Confirmed"}</h3>
            <div className="stat-row-cards">
              <div className="stat-card">
                <div className="value">{counts[key].guests}</div>
                <div className="label">Guests</div>
              </div>
              <div className="stat-card">
                <div className="value">{counts[key].plus_ones}</div>
                <div className="label">Plus Ones</div>
              </div>
              <div className="stat-card">
                <div className="value">{counts[key].total}</div>
                <div className="label">Total</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Recent RSVPs</h2>
      <table className="admin-table">
        <caption className="sr-only">Recent RSVP Responses</caption>
        <thead>
          <tr>
            <th>Name</th>
            <th>Attending</th>
            <th>Plus One</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((r) => (
            <tr key={r.id}>
              <td>{r.guest_name}</td>
              <td><span className={`badge ${r.attending ? "badge-yes" : "badge-no"}`}>{r.attending ? "Yes" : "No"}</span></td>
              <td>{r.plus_one_name || "—"}</td>
              <td>{new Date(`${r.created_at}Z`).toLocaleDateString()}</td>
            </tr>
          ))}
          {responses.length === 0 && (
            <tr><td colSpan={4} style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No RSVPs yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
