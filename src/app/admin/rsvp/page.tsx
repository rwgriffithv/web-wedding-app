import { getAllGuestsRsvpStatus } from "@/lib/repository/rsvp";
import { getAllConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { RsvpStatusTable } from "./rsvp-status-table";
import { RateLimitForm } from "@/components/rate-limit-form";
import { RsvpDeadlineForm } from "./rsvp-deadline-form";

export default function AdminRsvpPage() {
  const guests = getAllGuestsRsvpStatus();
  const config = Object.fromEntries(getAllConfig().map((c) => [c.key, c.value]));

  return (
    <>
      <Header title="RSVP Responses" description="View all guest RSVPs." />
      <details className="admin-section">
        <summary>RSVP Settings</summary>
        <div className="admin-section-body">
          <RsvpDeadlineForm deadline={config.rsvp_deadline || ""} />
        </div>
      </details>
      <details className="admin-section">
        <summary>Rate Limiting</summary>
        <div className="admin-section-body">
          <RateLimitForm
            config={config}
            maxKey="rsvp_rate_limit_max"
            windowKey="rsvp_rate_limit_window"
            maxDefault="10"
            description="Rate limiting for RSVP submissions, per party. Changes take effect on next request."
          />
        </div>
      </details>
      <details className="admin-section" open>
        <summary>RSVP Status ({guests.length})</summary>
        <div className="admin-section-body">
          <RsvpStatusTable guests={guests} />
        </div>
      </details>
    </>
  );
}
