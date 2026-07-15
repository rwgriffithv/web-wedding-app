"use client";

import { useActionState } from "react";
import { banViolationIpAction } from "./actions";
import { IpTable } from "./ip-table";
import type { RateLimitViolation } from "@/lib/db";

interface ViolationListProps {
  violations: RateLimitViolation[];
}

const initialBanState: { success?: boolean; error?: string } | null = null;

export function ViolationList({ violations }: ViolationListProps) {
  const [banState, banAction, isBanPending] = useActionState(banViolationIpAction, initialBanState);

  return (
    <>
      <IpTable
        violations={violations}
        emptyMessage="No rate limit violations recorded."
        countHeader="Violations"
        actions={(v) => (
          <form action={banAction}>
            <input type="hidden" name="ip_address" value={v.ip_address} />
            <button type="submit" className="btn btn-sm btn-outline" disabled={isBanPending}>
              Ban
            </button>
          </form>
        )}
      />
      {banState?.error && <p className="text-error text-sm">{banState.error}</p>}
    </>
  );
}
