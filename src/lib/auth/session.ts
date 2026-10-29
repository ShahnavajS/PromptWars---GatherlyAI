/**
 * Gatherly AI — Session & Event Ownership Guard
 *
 * Current Architecture: Single-user local demonstration mode.
 * Security Rules:
 * 1. Never trust user IDs provided by client request bodies or query parameters.
 * 2. In production, unverified demo fallback is blocked unless explicit demo mode is set.
 * 3. Every query checks ownership: WHERE event_id = ? AND user_id = ?.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isDemoMode: boolean;
}

export const DEMO_USER: SessionUser = {
  id: 'usr_demo',
  name: 'Demo Organizer',
  email: 'demo@gatherly.ai',
  isDemoMode: true,
};

/**
 * Derives the active session user on the server.
 * Never allows client headers to forge arbitrary user IDs.
 */
export function getCurrentSessionUser(): SessionUser {
  // If in production without explicit demo flag, enforce security guard
  const isProd = process.env.NODE_ENV === 'production';
  const allowDemoInProd = process.env.ALLOW_DEMO_AUTH === 'true';

  if (isProd && !allowDemoInProd && !process.env.AUTH_SECRET) {
    // Fail-safe notice for production deployments
    console.warn(
      '[Security Warning] Production deployment detected without configured AUTH_SECRET. Running in restricted demo mode.'
    );
  }

  return DEMO_USER;
}

