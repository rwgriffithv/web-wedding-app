# Suspicious IPs Redesign — Architecture Doc

**Date:** 2026-07-15

## Context

The previous suspicious IPs feature was redundant with auto-ban: suspicious IPs used the same threshold and window, so any IP that became "suspicious" was immediately banned. This made the counter meaningless — it was just a brief flash before becoming a banned IP.

The goal was to make suspicious IPs a meaningful "watch list": IPs that have accumulated enough violations to be concerning, but haven't yet crossed the auto-ban threshold. The two categories are mutually exclusive — suspicious = flagged but not banned, banned = known bad.

## Design Decisions

- **No schema change:** Suspicious threshold stored as a `site_config` key-value pair (`suspicious_ip_threshold`), consistent with all other runtime-tunable settings. No migration needed.
- **All-time violation count:** Suspicious IPs count all violations regardless of time window, unlike auto-ban which uses a rolling window. This gives admins a cumulative view of problematic IPs.
- **Separate from auto-ban:** The suspicious threshold is independent of the auto-ban threshold. An IP can be suspicious at 3 violations while auto-ban requires 5. Once banned, it drops off the suspicious list.
- **Clear action:** Deletes all violation records for an IP without banning it, for IPs that were flagged in error or are no longer concerning.

## Blueprint

### Modified Files
| File | Change |
|---|---|
| `src/lib/constants.ts` | Added `SUSPICIOUS_THRESHOLD_DEFAULT = 10` |
| `src/lib/repository/ip-bans.ts` | Added `getSuspiciousConfig()`, `getSuspiciousIps(threshold)`, `clearViolations(ip)`. Changed `getSuspiciousIpCount` signature to remove window parameter (all-time). |
| `src/app/admin/page.tsx` | Swapped banned/suspicious order, uses `getSuspiciousConfig` for threshold |
| `src/app/admin/security/page.tsx` | Added "Suspicious IPs" section with settings form + table |
| `src/app/admin/security/actions.ts` | Added `saveSuspiciousSettings`, `clearViolationsAction` |

### New Files
| File | Purpose |
|---|---|
| `src/app/admin/security/suspicious-settings-form.tsx` | Threshold config form (matches AutoBanForm style) |
| `src/app/admin/security/suspicious-ip-list.tsx` | Sortable table with Ban + Clear buttons |

### Test Files
| File | Change |
|---|---|
| `src/lib/repository/__tests__/ip-bans.test.ts` | Updated `getSuspiciousIpCount` tests, added tests for `getSuspiciousConfig`, `getSuspiciousIps`, `clearViolations` |
| `src/app/admin/security/__tests__/suspicious-ip-list.test.tsx` | New component tests |
| `src/app/admin/security/__tests__/suspicious-settings-form.test.tsx` | New component tests |
| `e2e/rate-limit.spec.ts` | Added 2 e2e tests for suspicious IPs section |

## Compliance

- [x] Server Components by default, Client Components only for interactivity
- [x] Server Actions via `"use server"` in dedicated `actions.ts`
- [x] Structured return types `{ success, data?, error? }` from actions
- [x] SQLite queries return typed interfaces from `src/lib/types.ts`
- [x] Admin routes protected via `isAdmin()` check
- [x] Input validation on all server actions (1-100 range for threshold)
- [x] No comments added
- [x] Follows existing ip-bans repository pattern exactly
- [x] All tests pass: 224 unit, 54 e2e
