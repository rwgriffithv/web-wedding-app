import { getAllGuests } from "@/lib/repository/guests";
import { getAllParties } from "@/lib/repository/party";
import { Header } from "@/components/header";
import { GuestForm } from "./guest-form";
import { GuestList } from "./guest-list";

export default function AdminGuestsPage() {
  const guests = getAllGuests();
  const parties = getAllParties();
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p.name]));

  return (
    <>
      <Header title="Guests" description="Manage guest credentials and party assignments." />
      <div className="admin-list">
        {guests.map((g) => (
          <GuestList key={g.id} guest={g} partyName={g.party_id ? partyMap[g.party_id] : undefined} />
        ))}
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Add Guest</h2>
        <GuestForm />
      </div>
    </>
  );
}
