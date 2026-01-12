// src/lib/api.ts
import liff from "@line/liff";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL in environment variables");
}

// Edge Functions base URL
const BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

// Helper: parse JSON safely
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Helper: for protected functions we require LIFF id_token
function requireIdToken(): string {
  const token = liff.getIDToken();
  if (!token) {
    throw new Error("Missing LIFF idToken. Are you logged in inside LIFF?");
  }
  return token;
}

/**
 * Call an Edge Function with LIFF Bearer token (LINE id_token)
 * - tenant_bootstrap is public, so token is optional there
 * - all other functions should require token
 */
export async function callFunction<TResponse>(
  functionName: string,
  body: Record<string, any> = {},
  opts: { auth?: boolean } = { auth: true }
): Promise<{ data: TResponse | null; error: any | null; status: number }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (opts.auth !== false) {
      headers["Authorization"] = `Bearer ${requireIdToken()}`;
    }

    const res = await fetch(`${BASE}/${functionName}`, {
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
        JSON.stringify(payload) ||
        `HTTP ${res.status}`;
      return { data: null, error: { message: msg, raw: payload }, status: res.status };
    }

    return { data: (payload as TResponse) ?? null, error: null, status: res.status };
  } catch (error: any) {
    return { data: null, error: { message: error?.message ?? String(error) }, status: 0 };
  }
}

/** tenant_bootstrap (PUBLIC) */
export function tenantBootstrap(slug: string, liffId: string | null = null) {
  return callFunction("tenant_bootstrap", { slug, liffId }, { auth: false });
}

/** ensure_profile_and_customer (AUTH via LIFF id_token) */
export function ensureProfileAndCustomer(payload: {
  slug?: string | null;
  liffId?: string | null;
  displayName?: string | null;
  phone?: string | null;
  pictureUrl?: string | null;
} = {}) {
  return callFunction("ensure_profile_and_customer", payload, { auth: true });
}

/** availability_search (AUTH via LIFF id_token) */
export function availabilitySearch(payload: {
  slug?: string | null;
  liffId?: string | null;
  serviceId: string;
  staffId?: string | null;
  dateFrom: string;
  dateTo: string;
}) {
  return callFunction("availability_search", payload, { auth: true });
}

/** create_hold (AUTH via LIFF id_token) */
export function createHold(payload: {
  slug?: string | null;
  liffId?: string | null;
  serviceId: string;
  staffId: string | null;
  startAt: string;
}) {
  return callFunction("create_hold", payload, { auth: true });
}

/** confirm_booking (AUTH via LIFF id_token) */
export function confirmBooking(payload: { holdId: string; notes?: string | null }) {
  return callFunction("confirm_booking", payload, { auth: true });
}

/** payment_init (AUTH via LIFF id_token) */
export function paymentInit(payload: { bookingId: string; slug?: string | null; liffId?: string | null }) {
  return callFunction("payment_init", payload, { auth: true });
}
