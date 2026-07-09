import { getAllParties, getPartyWithMembers } from "@/lib/repository/party";
import { getAllGuests } from "@/lib/repository/guests";
import { Header } from "@/components/header";
import { PartyList } from "./party-list";
import { PartyForm } from "./party-form";

export default function AdminPartiesPage() {
  const parties = getAllParties();
  const allGuests = getAllGuests();

  const partiesWithMembers = parties.map(p => {
    const full = getPartyWithMembers(p.id);
    return { party: p, members: full?.members ?? [] };
  });

  return (
    <>
      <Header title="Parties" description="Group guests into parties for easy family RSVP." />
      <PartyForm />
      <div className="admin-list">
        {partiesWithMembers.length === 0 && (
          <p style={{ color: "var(--color-muted)", fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
            No parties yet. Create one above.
          </p>
        )}
        {partiesWithMembers.map(({ party, members }) => (
          <PartyList key={party.id} party={party} members={members} allGuests={allGuests} />
        ))}
      </div>
    </>
  );
}
