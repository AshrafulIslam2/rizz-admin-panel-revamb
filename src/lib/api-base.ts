/**
 * Base URL for every backend call made from the browser.
 *
 * It points at this app's own authenticated proxy (src/app/api/backend), which
 * checks the admin session cookie and attaches the secret admin key on the
 * server. The browser never talks to the backend directly and never sees the key.
 */
export const CLIENT_API_BASE = "/api/backend";
