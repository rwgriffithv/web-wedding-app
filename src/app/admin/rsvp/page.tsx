import { getAllGuestsRsvpStatus } from "@/lib/repository/rsvp";
import { Header } from "@/components/header";
import { RsvpStatusTable } from "./rsvp-status-table";

export default function AdminRsvpPage() {
  const guests = getAllGuestsRsvpStatus();

  return (
    <>
      <Header title="RSVP Responses" description="View all guest RSVPs." />
      <details className="admin-section" open>
        <summary>RSVP Status ({guests.length})</summary>
        <div className="admin-section-body">
          <RsvpStatusTable guests={guests} />
        </div>
      </details>
    </>
  );
}
