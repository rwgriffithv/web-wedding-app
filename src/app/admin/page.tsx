import { getAll } from "@/lib/repository/guests";
import { getAllUsers } from "@/lib/repository/users";
import { getRecentResponses, getResponseCount } from "@/lib/repository/rsvp";
import { Header } from "@/components/header";

export default function AdminDashboardPage() {
  const guests = getAll();
  const users = getAllUsers();
  const rsvpCount = getResponseCount();
  const responses = getRecentResponses(10);

  return (
    <>
      <Header title="Dashboard" description="Overview of your wedding website." />
      <div className="stats">
        <div className="stat-card">
          <div className="value">{guests.length}</div>
          <div className="label">Total Guests</div>
        </div>
        <div className="stat-card">
          <div className="value">{users.length}</div>
          <div className="label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="value">{rsvpCount.total}</div>
          <div className="label">RSVPs Received</div>
        </div>
        <div className="stat-card">
          <div className="value">{rsvpCount.attending}</div>
          <div className="label">Attending</div>
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
