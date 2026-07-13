import { getAll } from "@/lib/repository/party";
import { getGuestsByPartyId } from "@/lib/repository/guests";
import { Header } from "@/components/header";
import { PartyList } from "./party-list";

export default function AdminPartiesPage() {
  const parties = getAll();

  const partiesWithGuests = parties.map(party => ({
    ...party,
    guests: getGuestsByPartyId(party.id),
  }));

  return (
    <>
      <Header title="Parties" description="Manage party codes and view members." />
      <details className="admin-section" open>
        <summary>Parties ({parties.length})</summary>
        <div className="admin-section-body">
          {parties.length === 0 ? (
            <p className="empty-state">No parties yet. Create one from the Guests page.</p>
          ) : (
            <PartyList parties={partiesWithGuests} />
          )}
        </div>
      </details>
    </>
  );
}
