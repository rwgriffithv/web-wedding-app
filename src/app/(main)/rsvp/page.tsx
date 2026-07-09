import { redirect } from "next/navigation";
import { getCurrentGuest, getPartyId } from "@/lib/auth";
import { getResponseByGuest } from "@/lib/repository/rsvp";
import { getGuestsByPartyId } from "@/lib/repository/guests";
import { getPartyById } from "@/lib/repository/party";
import { RsvpForm } from "./rsvp-form";

export default async function RsvpPage() {
  const guest = await getCurrentGuest();
  const partyId = await getPartyId();

  if (!guest && !partyId) redirect("/");

  if (guest && !guest.can_rsvp) {
    return (
      <div className="page-content">
        <h1>RSVP</h1>
        <div style={{ padding: "2rem", background: "var(--color-surface)", borderRadius: "var(--radius)", textAlign: "center" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: "0.5rem" }}>
            You&rsquo;re on the guest list, but no RSVP is required for you.
          </p>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            If you have any questions, please contact us directly.
          </p>
        </div>
      </div>
    );
  }

  if (guest && !guest.party_id) {
    return (
      <div className="page-content">
        <h1>RSVP</h1>
        <RsvpForm
          memberId={guest.id}
          displayName={guest.display_name}
          canBringPlusOne={guest.can_bring_plus_one === 1}
          existingResponse={getResponseByGuest(guest.id) ?? undefined}
        />
      </div>
    );
  }

  const pid = partyId ?? guest!.party_id!;
  const party = getPartyById(pid);
  const members = getGuestsByPartyId(pid);

  return (
    <div className="page-content">
      <h1>RSVP</h1>
      {party && <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>Party: {party.name}</p>}
      <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Please respond for each member of your party. Each member can be submitted individually.
      </p>

      {members.map((m) => {
        const response = getResponseByGuest(m.id);
        return (
          <div key={m.id} style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--color-surface)", borderRadius: "var(--radius)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{m.display_name}</h3>
            {response && (
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "0.75rem" }}>
                Current response: {response.attending ? "Attending" : "Not attending"}
                {response.plus_one_name && <> &middot; Plus one: {response.plus_one_name}</>}
              </p>
            )}
            <RsvpForm
              memberId={m.id}
              displayName={m.display_name}
              canBringPlusOne={m.can_bring_plus_one === 1}
              existingResponse={response ?? undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
