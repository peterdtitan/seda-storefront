/**
 * The most a photograph may weigh by the time it is sent.
 *
 * Held below the 4.5mb body limit in next.config.ts so the multipart envelope has
 * room, and that limit in turn is held at Vercel's own ceiling on a function payload
 * — which no Next setting can raise. Shared by the browser, which shrinks a file to
 * fit before uploading, and by the server, which re-checks rather than trusting it.
 */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
