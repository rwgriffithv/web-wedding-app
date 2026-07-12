import { getAll } from "@/lib/repository/guests";
import { getAll as getAllParties } from "@/lib/repository/party";
import { Header } from "@/components/header";
import { GuestTable } from "./guest-table";

export default function AdminGuestsPage() {
  const guests = getAll();
  const parties = getAllParties();

  return (
    <>
      <Header title="Guests" description="Manage guests and their party assignments." />
      <GuestTable guests={guests} parties={parties} />
    </>
  );
}
