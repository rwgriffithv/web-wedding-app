"use client";

import { useActionState } from "react";
import { banViolationIpAction, clearViolationsAction } from "./actions";
import { IpTable } from "./ip-table";
import type { RateLimitViolation } from "@/lib/types";

interface SuspiciousIpListProps {
  violations: RateLimitViolation[];
}

const initialBanState: { success?: boolean; error?: string } | null = null;
const initialClearState: { success?: boolean; error?: string } | null = null;

export function SuspiciousIpList({ violations }: SuspiciousIpListProps) {
  const [banState, banAction, isBanPending] = useActionState(banViolationIpAction, initialBanState);
  const [clearState, clearAction, isClearPending] = useActionState(clearViolationsAction, initialClearState);

  return (
    <>
      <IpTable
        violations={violations}
        emptyMessage="No suspicious IPs detected."
        countHeader="Total Violations"
        actions={(v) => (
          <div className="flex-gap-sm">
            <form action={banAction}>
              <input type="hidden" name="ip_address" value={v.ip_address} />
              <button type="submit" className="btn btn-sm btn-outline" disabled={isBanPending}>
                Ban
              </button>
            </form>
            <form action={clearAction}>
              <input type="hidden" name="ip_address" value={v.ip_address} />
              <button type="submit" className="btn btn-sm btn-outline" disabled={isClearPending}>
                Clear
              </button>
            </form>
          </div>
        )}
      />
      {banState?.error && <p className="text-error text-sm">{banState.error}</p>}
      {clearState?.error && <p className="text-error text-sm">{clearState.error}</p>}
    </>
  );
}
