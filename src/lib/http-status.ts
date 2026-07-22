/**
 * HTTP status codes that carry application-specific handling logic.
 *
 * These are extracted so the intent at each handling site is clear
 * and searchable, rather than relying on raw numeric codes.
 */

/** Session expired or missing — redirect client to login. */
export const STATUS_UNAUTHORIZED = 401;

/** Upload rejected because the file exceeds the server's configured limit. Triggers a client-side cache refresh of the max file size. */
export const STATUS_PAYLOAD_TOO_LARGE = 413;

/** Rate limit exceeded — client should wait before retrying. Includes Retry-After header. */
export const STATUS_TOO_MANY_REQUESTS = 429;
