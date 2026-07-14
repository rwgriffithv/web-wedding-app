import { Header } from "@/components/header";
import { getDashboardCounts, getRecentResponses } from "@/lib/repository/rsvp";
import { getStats } from "@/lib/repository/questions";

export default function AdminDashboardPage() {
  const counts = getDashboardCounts();
  const responses = getRecentResponses(10);
  const questionStats = getStats();
  const answered = questionStats.total - questionStats.unanswered;

  return (
    <>
      <Header title="Dashboard" description="Overview of your wedding website." />
      <div className="stat-rows">
        {(["invited", "expected", "confirmed"] as const).map(key => (
          <div key={key} className="stat-row">
            <h3 className="stat-row-title">{key === "invited" ? "Invited" : key === "expected" ? "Expected" : "Confirmed"}</h3>
            <div className="stat-row-figures">
              <span className="stat-figure"><span className="stat-number">{counts[key].guests}</span> Guests</span>
              <span className="stat-figure"><span className="stat-number">{counts[key].plus_ones}</span> Plus Ones</span>
              <span className="stat-separator" aria-hidden="true" />
              <span className="stat-figure stat-figure--total"><span className="stat-number">{counts[key].total}</span> Total</span>
            </div>
          </div>
        ))}
        <div className="stat-row">
          <h3 className="stat-row-title">Help Questions</h3>
          <div className="stat-row-figures">
            <span className="stat-figure"><span className="stat-number">{answered}</span> Answered</span>
            <span className={`stat-figure${questionStats.unanswered > 0 ? " stat-figure--warning" : ""}`}><span className="stat-number">{questionStats.unanswered}</span> Unanswered</span>
          </div>
        </div>
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
