// src/lib/api.js
import liff from '@line/liff';
import { getIdToken, isLoggedIn, isTokenExpired, getFreshToken } from './liffAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL in environment variables");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY in environment variables");
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

// Helper: Get fresh token (refresh if needed) - uses getFreshToken from liffAuth

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
    // Always include apikey header (required by Supabase Edge Functions)
    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY, // Always required
    };

    // Try to get fresh token if available
    let token = null;
    try {
      if (isLoggedIn()) {
        // Check current token expiration
        const currentToken = getIdToken();
        if (currentToken && isTokenExpired(currentToken)) {
          console.log('[API] Token expired, getting fresh token...');
          // Get fresh token (may redirect if login needed)
          token = await getFreshToken();
          if (!token) {
            // Redirect happened, return early
            return { data: null, error: { message: 'Redirecting to LINE login for token refresh' }, status: 0 };
          }
        } else {
          token = currentToken;
        }
      }
    } catch (e) {
      // Token not available, will handle below
      if (opts.auth !== false) {
        throw e; // Re-throw if auth is required
      }
    }

    // Set Authorization header based on endpoint type
    if (opts.auth !== false) {
      // Authenticated endpoint: use LINE ID token
      if (!token) {
        throw new Error("Missing LIFF idToken. Please ensure you're logged in through LINE LIFF.");
      }
      headers["Authorization"] = `Bearer ${token}`; // LINE ID token for auth endpoints
      headers["x-line-id-token"] = token; // Also send as custom header
    } else {
      // Public endpoint: use anon key for Authorization
      headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`; // Anon key for public endpoints
      // Optionally include LINE token if available (for logging/analytics)
      if (token) {
        headers["x-line-id-token"] = token;
      }
    }

    const url = `${BASE}/${functionName}`;
    
    // Debug: log request details
    console.log(`[API] Calling ${functionName}:`, {
      url,
      headers: {
        ...headers,
        Authorization: headers.Authorization ? `${headers.Authorization.substring(0, 30)}...` : 'none',
        apikey: headers.apikey ? `${headers.apikey.substring(0, 20)}...` : 'none',
      },
      body
    });
    
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
        // Add credentials for CORS if needed
        mode: 'cors',
        credentials: 'omit',
      });
    } catch (fetchError) {
      // Network error - likely CORS or connection issue
      console.error(`[API] Fetch error for ${functionName}:`, fetchError);
      return { 
        data: null, 
        error: { 
          message: `Network error: ${fetchError.message}. Check CORS configuration on backend.`,
          type: 'network_error'
        }, 
        status: 0 
      };
    }

    const payload = await safeJson(res);

    if (!res.ok) {
      // Check if it's a token expiration error
      const errorMsg = payload?.error || payload?.message || payload?.msg || payload?.error?.message || '';
      const isExpiredError = res.status === 401 && (
        errorMsg.includes('expired') || 
        errorMsg.includes('Invalid JWT') ||
        errorMsg.toLowerCase().includes('token')
      );

      // If token expired and we haven't retried, try to refresh and retry once
      if (isExpiredError && opts.auth !== false && token) {
        console.log('[API] Token expired error detected:', errorMsg);
        console.log('[API] Attempting to refresh token and retry...');
        
        try {
          // Get fresh token (may redirect if login needed)
          const freshToken = await getFreshToken();
          
          if (!freshToken) {
            // Redirect happened, return early
            return { 
              data: null, 
              error: { 
                message: 'Token expired. Redirecting to LINE login. Please try again after logging in.',
                type: 'token_expired_redirect'
              }, 
              status: 401 
            };
          }
          
          if (freshToken !== token) {
            console.log('[API] Got fresh token, retrying request...');
            
            // Update headers with fresh token
            headers["Authorization"] = `Bearer ${freshToken}`;
            headers["x-line-id-token"] = freshToken;
            
            // Retry the request
            const retryRes = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body ?? {}),
              mode: 'cors',
              credentials: 'omit',
            });
            
            const retryPayload = await safeJson(retryRes);
            
            if (retryRes.ok) {
              console.log('[API] Retry successful with fresh token');
              return { data: retryPayload ?? null, error: null, status: retryRes.status };
            }
            
            // If retry also failed, return the error
            const retryMsg = retryPayload?.error || retryPayload?.message || retryPayload?.msg || retryPayload?.error?.message || JSON.stringify(retryPayload) || `HTTP ${retryRes.status}`;
            return { data: null, error: { message: retryMsg, raw: retryPayload }, status: retryRes.status };
          } else {
            console.warn('[API] Got same token after refresh attempt');
          }
        } catch (refreshError) {
          console.error('[API] Failed to refresh token:', refreshError);
          // Continue to return original error
        }
      }
      
      // normalize error shape
      const msg =
        payload?.error ||
        payload?.message ||
        payload?.msg ||
        payload?.error?.message ||
        JSON.stringify(payload) ||
        `HTTP ${res.status}`;
      return { data: payload ?? null, error: { message: msg, raw: payload }, status: res.status };
    }

    return { data: payload ?? null, error: null, status: res.status };
  } catch (error) {
    return { data: null, error: { message: error?.message ?? String(error) }, status: 0 };
  }
}

/** tenant_bootstrap (PUBLIC) */
export function tenantBootstrap(payload) {
  // Accept either object payload or legacy (slug, liffId) format
  if (typeof payload === 'string') {
    // Legacy format: tenantBootstrap(slug, liffId)
    const [slug, liffId] = arguments;
    return callFunction("tenant_bootstrap", { slug, name: slug, liffId }, { auth: false });
  }
  // New format: tenantBootstrap({ slug, name, liffId })
  return callFunction("tenant_bootstrap", payload, { auth: false });
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

/** list_services (AUTH via LIFF id_token) - Get available services for tenant */
export function listServices(payload = {}) {
  return callFunction("list_services", payload, { auth: true });
}

/** list_staff (AUTH via LIFF id_token) - Get available staff for tenant */
export function listStaff(payload = {}) {
  return callFunction("list_staff", payload, { auth: true });
}
