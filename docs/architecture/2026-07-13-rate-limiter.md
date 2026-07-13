# Rate Limiter

**Date:** 2026-07-13

## Context

Rate limiting protects the login endpoint from brute-force attacks. The implementation is per-request, configurable via the admin dashboard.

## Design Decisions

### Per-Request Config Caching

The `check()` function accepts an optional `config` parameter so callers read the database once per request, not per-check. This prevents multiple DB reads when checking multiple login attempts.

### In-Memory Store

Rate limit counters are stored in-memory (JavaScript `Map`). This is appropriate for a single-instance deployment. If scaling to multiple instances, a shared store (Redis) would be needed.

## Architecture

```
Request → parseSession() → rateLimiter.check(key, config)
                         → if false, return 429
                         → if true, proceed
```

## Configuration

Rate limiting is configurable via the admin dashboard:
- `rate_limit_max_attempts`: Max attempts per window (default: 5)
- `rate_limit_window_seconds`: Window duration in seconds (default: 60)

## Caddy Integration

**Important:** This application is deployed behind Caddy, which provides additional rate limiting and IP-based protection at the reverse proxy layer. The application-level rate limiter is a secondary defense. Caddy handles:

- IP-based rate limiting
- Connection throttling
- TLS termination
- Request buffering

Do not expose the application directly to the internet without Caddy. The application's rate limiter relies on `X-Forwarded-For` headers from Caddy for IP-based keying.

## Scalability Notes

### Current: In-Memory Store (Sufficient for ~100 Users)

The in-memory store handles ~100,000 operations/sec. For 100 concurrent users, this is trivially fast. No optimization needed at this scale.

### Scaling to ~1,000+ Concurrent Users

At higher traffic, the in-memory store becomes a bottleneck if scaling to multiple instances. Two options:

#### Option 1: Redis Store

Replace the in-memory `Map` with Redis:

```
Request → Redis INCR key → if count > max, return 429
                         → else, proceed
```

**Benefits:**
- Shared across multiple server instances
- Automatic TTL-based expiry
- Persistent across restarts

**Implementation:**
- Use `ioredis` or `@upstash/redis` (Upstash for serverless)
- Key pattern: `ratelimit:{name}:{key}`
- TTL: Same as window duration

#### Option 2: Caddy-Only Rate Limiting

Move rate limiting entirely to Caddy's `rate_limit` directive. This removes the application-level rate limiter but centralizes all rate limiting at the proxy layer.

**Benefits:**
- No application code changes
- Caddy handles all rate limiting logic
- Better performance (no app-level overhead)

**Trade-off:** Loses configurability via admin dashboard.

### Recommendation

For this wedding site (~100 users), the in-memory store is fine. If scaling beyond ~500 concurrent users, **Option 1 (Redis store)** is the simpler path — it's a drop-in replacement for the `Map` with minimal code changes.

## Blueprint

### Files Modified

- `src/lib/rate-limit.ts` — Rate limiter implementation

### Call Sites

| File | Usage |
|---|---|
| `src/app/login/actions.ts` | Login rate limiting |
| `src/app/admin/site/actions.ts` | Config save (rate limit settings) |

## Compliance

- [x] HMAC signature verification preserved
- [x] DB validation added for all session types
- [x] No breaking changes to existing functionality
- [x] Follows existing repository pattern
- [x] Type-safe implementation
- [x] Scalability notes documented
