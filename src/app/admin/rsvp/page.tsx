import { getAllGuestsRsvpStatus } from "@/lib/repository/rsvp";
import { getAllConfig } from "@/lib/repository/site-config";
import { Header } from "@/components/header";
import { RsvpStatusTable } from "./rsvp-status-table";
import { RateLimitForm } from "@/components/rate-limit-form";
import { RsvpDeadlineForm } from "./rsvp-deadline-form";
import { RSVP_RATE_LIMIT_MAX_KEY, RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, RSVP_RATE_LIMIT_MAX_DEFAULT, RSVP_RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";

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
            maxKey={RSVP_RATE_LIMIT_MAX_KEY}
            windowKey={RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY}
            maxDefault={String(RSVP_RATE_LIMIT_MAX_DEFAULT)}
            windowDefault={String(RSVP_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)}
            description="Rate limiting for RSVP submissions, per party. Changes take effect on next request."
            revalidatePaths={["/admin/rsvp"]}
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
