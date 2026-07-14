"use client";

import { useActionState } from "react";
import { unbanIpAction } from "./actions";
import type { BannedIp } from "@/lib/db";

interface BanListProps {
  ips: BannedIp[];
}

const REASON_LABELS: Record<string, string> = {
  "auto:rate-limit-threshold": "Auto-banned (rate limit threshold)",
  "manual": "Manual",
};

function formatReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

const initialUnbanState: { success?: boolean; error?: string } | null = null;

export function BanList({ ips }: BanListProps) {
  const [unbanState, unbanAction, isUnbanPending] = useActionState(unbanIpAction, initialUnbanState);

  if (ips.length === 0) {
    return <p className="empty-state">No banned IPs.</p>;
  }

  return (
    <div className="admin-list">
      {ips.map((b) => (
        <div key={b.id} className="admin-list-item">
          <div className="item-info">
            <div className="item-title" style={{ fontFamily: "monospace" }}>{b.ip_address}</div>
            <div className="item-meta">
              Banned {new Date(b.banned_at + "Z").toLocaleDateString()}
              {b.reason !== "manual" && <span> &middot; Reason: {formatReason(b.reason)}</span>}
            </div>
          </div>
          <div className="item-actions">
            <form action={unbanAction}>
              <input type="hidden" name="id" value={b.id} />
              <button type="submit" className="btn btn-sm btn-outline" disabled={isUnbanPending}>
                Unban
              </button>
            </form>
          </div>
        </div>
      ))}
      {unbanState?.error && <p className="text-error text-sm">{unbanState.error}</p>}
    </div>
  );
}
