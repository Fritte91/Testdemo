import { supabase } from './supabase'

/**
 * Invoke a Supabase Edge Function
 */
export async function invokeFunction(functionName, body = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body
    })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error(`Error invoking ${functionName}:`, error)
    return { data: null, error }
  }
}

/**
 * Call tenant_bootstrap (public)
 */
export async function tenantBootstrap(slug, liffId = null) {
  return invokeFunction('tenant_bootstrap', {
    slug,
    ...(liffId && { liffId })
  })
}

/**
 * Call ensure_profile_and_customer (auth)
 */
export async function ensureProfileAndCustomer() {
  return invokeFunction('ensure_profile_and_customer', {})
}

/**
 * Call availability_search (auth)
 */
export async function availabilitySearch(serviceId, dateFrom, dateTo, staffId = null) {
  return invokeFunction('availability_search', {
    serviceId,
    dateFrom,
    dateTo,
    ...(staffId && { staffId })
  })
}

/**
 * Call create_hold (auth)
 */
export async function createHold(serviceId, staffId, startAt, slug, liffId = null) {
  return invokeFunction('create_hold', {
    serviceId,
    staffId,
    startAt,
    slug,
    ...(liffId && { liffId })
  })
}

/**
 * Call confirm_booking (auth)
 */
export async function confirmBooking(holdId, notes = '') {
  return invokeFunction('confirm_booking', {
    holdId,
    notes
  })
}

/**
 * Call payment_init (auth, optional)
 */
export async function paymentInit(bookingId, slug, liffId = null) {
  return invokeFunction('payment_init', {
    bookingId,
    slug,
    ...(liffId && { liffId })
  })
}
