"use client";

import { useRateLimitCooldown } from "@/lib/use-rate-limit-cooldown";
import { RateLimitContext } from "./rate-limit-context";
import { RsvpForm } from "./rsvp-form";
import type { RsvpResponse } from "@/lib/types";

interface Member {
  id: number;
  display_name: string;
  can_bring_plus_one: number;
}

interface RsvpFormListProps {
  members: Member[];
  responsesByGuest: Map<number, Pick<RsvpResponse, "guest_name" | "attending" | "plus_one_name">>;
  isLocked: boolean;
}

export function RsvpFormList({ members, responsesByGuest, isLocked }: RsvpFormListProps) {
  const cooldown = useRateLimitCooldown("rl_r_until");

  return (
    <RateLimitContext.Provider value={cooldown}>
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
              canBringPlusOne={m.can_bring_plus_one === 1}
              existingResponse={response ?? undefined}
              isLocked={isLocked}
            />
          </div>
        );
      })}
    </RateLimitContext.Provider>
  );
}
