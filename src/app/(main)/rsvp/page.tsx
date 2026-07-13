import { redirect } from "next/navigation";
import { parseSession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { getResponsesByGuests } from "@/lib/repository/rsvp";
import { getGuestsByPartyId } from "@/lib/repository/guests";
import { getPartyById } from "@/lib/repository/party";
import { RsvpForm } from "./rsvp-form";

export default async function RsvpPage() {
  const session = await parseSession();
  if (!session) redirect("/");

  if (session.type === "admin" || session.type === "viewer") {
    return (
      <div className="page-content">
        <h1>RSVP</h1>
        <div style={{ padding: "2rem", background: "var(--color-surface)", borderRadius: "var(--radius)" }} className="text-center">
          <p className="text-muted mb-1">
            RSVP is not available for user logins.
          </p>
          <p className="text-muted text-sm">
            Please use your Party Code to RSVP.
          </p>
        </div>
      </div>
    );
  }

  const partyId = session.partyId;
  if (!partyId) redirect("/");

  const party = getPartyById(partyId);
  const members = getGuestsByPartyId(partyId);

  if (members.length === 0) {
    return (
      <div className="page-content">
        <h1>RSVP</h1>
        <div style={{ padding: "2rem", background: "var(--color-surface)", borderRadius: "var(--radius)" }} className="text-center">
          <p className="text-muted mb-1">
            No party members found.
          </p>
          <p className="text-muted text-sm">
            Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  const responses = getResponsesByGuests(members.map(m => m.id));
  const responsesByGuest = new Map(responses.map(r => [r.guest_id, r]));

  const deadlineStr = getConfig("rsvp_deadline");
  const deadline = deadlineStr ? new Date(deadlineStr) : null;
  const isLocked = deadline ? new Date() > deadline : false;
  const formattedDeadline = deadline
    ? deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="page-content">
      <h1>RSVP</h1>
      {party && <p className="text-muted" style={{ marginBottom: "1.5rem" }}>Party: {party.name}</p>}
      <p className="text-muted text-sm mb-1">
        Please respond for each member of the party. Submissions may be changed up until the deadline.
      </p>
      <p className="text-muted text-sm" style={{ marginBottom: "1.5rem" }}>
        RSVP Deadline: {formattedDeadline ?? "None"}
      </p>

      {members.map((m) => {
        const response = responsesByGuest.get(m.id);
        return (
          <div key={m.id} className="rsvp-member">
            <div>
              <div className="rsvp-member-name">{m.display_name}</div>
              {response && (
                <div className="rsvp-member-meta">
                  {response.attending ? "Attending" : "Not attending"}
                  {response.plus_one_name && <>, Plus-one: {response.plus_one_name}</>}
                </div>
              )}
            </div>
            <RsvpForm
              memberId={m.id}
              displayName={m.display_name}
              canBringPlusOne={m.can_bring_plus_one === 1}
              existingResponse={response ?? undefined}
              isLocked={isLocked}
            />
          </div>
        );
      })}
    </div>
  );
}
