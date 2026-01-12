// src/lib/api.js
import { getIdToken, isLoggedIn } from './liffAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL in environment variables");
}

// Edge Functions base URL
const BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

// Helper: parse JSON safely
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Helper: for protected functions we require LIFF id_token
function requireIdToken() {
  if (!isLoggedIn()) {
    throw new Error("LIFF is not logged in. Please ensure you're accessing this app through LINE LIFF.");
  }
  
  const token = getIdToken();
  if (!token) {
    throw new Error("Missing LIFF idToken. Are you logged in inside LIFF?");
  }
  return token;
}

/**
 * Call an Edge Function with LIFF Bearer token (LINE id_token)
 * - If auth is required (default), token must be present
 * - If auth is optional (opts.auth = false), token is sent if available but not required
 */
export async function callFunction(
  functionName,
  body = {},
  opts = { auth: true }
) {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Try to get token if available
    let token = null;
    try {
      if (isLoggedIn()) {
        token = getIdToken();
      }
    } catch (e) {
      // Token not available, will handle below
    }

    // If auth is required, ensure we have a token
    if (opts.auth !== false) {
      if (!token) {
        throw new Error("Missing LIFF idToken. Please ensure you're logged in through LINE LIFF.");
      }
      headers["Authorization"] = `Bearer ${token}`;
    } else if (token) {
      // Even for public endpoints, send token if available
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${BASE}/${functionName}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });

    const payload = await safeJson(res);

    if (!res.ok) {
      // normalize error shape
      const msg =
        payload?.error ||
        payload?.message ||
        payload?.msg ||
        payload?.error?.message ||
        JSON.stringify(payload) ||
        `HTTP ${res.status}`;
      return { data: null, error: { message: msg, raw: payload }, status: res.status };
    }

    return { data: payload ?? null, error: null, status: res.status };
  } catch (error) {
    return { data: null, error: { message: error?.message ?? String(error) }, status: 0 };
  }
}

/** tenant_bootstrap (PUBLIC) */
export function tenantBootstrap(slug, liffId = null) {
  return callFunction("tenant_bootstrap", { slug, liffId }, { auth: false });
}

/** ensure_profile_and_customer (AUTH via LIFF id_token) */
export function ensureProfileAndCustomer(payload = {}) {
  return callFunction("ensure_profile_and_customer", payload, { auth: true });
}

/** availability_search (AUTH via LIFF id_token) */
export function availabilitySearch(payload) {
  return callFunction("availability_search", payload, { auth: true });
}

/** create_hold (AUTH via LIFF id_token) */
export function createHold(payload) {
  return callFunction("create_hold", payload, { auth: true });
}

/** confirm_booking (AUTH via LIFF id_token) */
export function confirmBooking(payload) {
  return callFunction("confirm_booking", payload, { auth: true });
}

/** payment_init (AUTH via LIFF id_token) */
export function paymentInit(payload) {
  return callFunction("payment_init", payload, { auth: true });
}
