import * as Sentry from "@sentry/nextjs";

/**
 * Error monitoring. Inert unless SENTRY_DSN is set (so local dev and unconfigured deployments are unaffected).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  });
}

export const onRequestError = Sentry.captureRequestError;
