import { getAllResponses } from "@/lib/repository/rsvp";
import { Header } from "@/components/header";

export default function AdminRsvpPage() {
  const responses = getAllResponses();

  return (
    <>
      <Header title="RSVP Responses" description="View all guest RSVPs." />
      <table>
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
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {responses.length === 0 && (
            <tr><td colSpan={4} style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No responses yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
