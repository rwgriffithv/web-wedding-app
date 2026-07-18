"use client";

import { useActionState, useState, useMemo } from "react";
import { banViolationIpAction, unbanIpAction, clearViolationsAction } from "./actions";
import type { CombinedIp } from "@/lib/types";
import { formatUtcDateTime } from "@/lib/datetime";

type SortField = "violation_count" | "last_violated_at";
type SortDir = "asc" | "desc";
type FilterMode = "all" | "banned" | "suspicious";

interface SecurityTableProps {
  ips: CombinedIp[];
}

const initialBanState: { success?: boolean; error?: string } | null = null;
const initialUnbanState: { success?: boolean; error?: string } | null = null;
const initialClearState: { success?: boolean; error?: string } | null = null;

export function SecurityTable({ ips }: SecurityTableProps) {
  const [sortField, setSortField] = useState<SortField>("violation_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<FilterMode>("all");

  const [banState, banAction, isBanPending] = useActionState(banViolationIpAction, initialBanState);
  const [unbanState, unbanAction, isUnbanPending] = useActionState(unbanIpAction, initialUnbanState);
  const [clearState, clearAction, isClearPending] = useActionState(clearViolationsAction, initialClearState);

  const sorted = useMemo(() => {
    let result = [...ips];
    if (filter === "banned") result = result.filter((ip) => ip.is_banned);
    else if (filter === "suspicious") result = result.filter((ip) => ip.is_suspicious);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "violation_count") {
        cmp = a.violation_count - b.violation_count;
      } else {
        const aVal = a.last_violated_at ?? "";
        const bVal = b.last_violated_at ?? "";
        cmp = aVal.localeCompare(bVal);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [ips, sortField, sortDir, filter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const filterButton = (mode: FilterMode, label: string) => (
    <button
      type="button"
      className={`btn btn-sm ${filter === mode ? "btn-primary" : "btn-outline"}`}
      onClick={() => setFilter(mode)}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex-gap-sm mb-2">
        {filterButton("all", "All")}
        {filterButton("banned", "Banned")}
        {filterButton("suspicious", "Suspicious")}
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Banned</th>
              <th>Suspicious</th>
              <th onClick={() => toggleSort("violation_count")} className="sortable">
                Total Violations{sortIndicator("violation_count")}
              </th>
              <th onClick={() => toggleSort("last_violated_at")} className="sortable">
                Last Violation{sortIndicator("last_violated_at")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {filter === "all" ? "No IPs with violations or bans." : `No ${filter} IPs.`}
                </td>
              </tr>
            )}
            {sorted.map((ip) => (
              <tr key={ip.ip_address}>
                <td style={{ fontFamily: "monospace" }}>{ip.ip_address}</td>
                <td>
                  {ip.is_banned ? (
                    <form action={unbanAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={String(ip.ban_id)} />
                      <button type="submit" className="btn btn-sm btn-danger" disabled={isUnbanPending}>
                        Yes
                      </button>
                    </form>
                  ) : (
                    <form action={banAction} style={{ display: "inline" }}>
                      <input type="hidden" name="ip_address" value={ip.ip_address} />
                      <button type="submit" className="btn btn-sm btn-outline" disabled={isBanPending}>
                        No
                      </button>
                    </form>
                  )}
                </td>
                <td>
                  {ip.is_suspicious ? (
                    <span className="text-warning">Yes</span>
                  ) : (
                    <span className="text-muted">No</span>
                  )}
                </td>
                <td>{ip.violation_count}</td>
                <td>{ip.last_violated_at ? formatUtcDateTime(ip.last_violated_at) : "—"}</td>
                <td>
                  {ip.violation_count > 0 && (
                    <form action={clearAction} style={{ display: "inline" }}>
                      <input type="hidden" name="ip_address" value={ip.ip_address} />
                      <button type="submit" className="btn btn-sm btn-outline" disabled={isClearPending}>
                        Clear
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {banState?.error && <p className="text-error text-sm">{banState.error}</p>}
      {unbanState?.error && <p className="text-error text-sm">{unbanState.error}</p>}
      {clearState?.error && <p className="text-error text-sm">{clearState.error}</p>}
    </>
  );
}
