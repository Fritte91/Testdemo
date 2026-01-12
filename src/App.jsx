import { useState, useEffect } from 'react'
import { initLiff, isLoggedIn, getProfile } from './lib/liffAuth'
import {
  tenantBootstrap,
  ensureProfileAndCustomer,
  availabilitySearch,
  createHold,
  confirmBooking,
  paymentInit
} from './lib/api'
import { StatusBar } from './components/StatusBar'
import { JsonPanel } from './components/JsonPanel'
import './index.css'

function App() {
  const [liffStatus, setLiffStatus] = useState(false)
  const [lineProfile, setLineProfile] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [loading, setLoading] = useState(true)

  // Tenant Context
  const [tenantSlug, setTenantSlug] = useState(import.meta.env.VITE_TENANT_SLUG || 'demo')
  const [tenantLiffId, setTenantLiffId] = useState('')
  const [bootstrapResult, setBootstrapResult] = useState(null)

  // Setup
  const [setupResult, setSetupResult] = useState(null)

  // Availability
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [availabilityResult, setAvailabilityResult] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Hold
  const [holdId, setHoldId] = useState('')
  const [holdResult, setHoldResult] = useState(null)

  // Confirm
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [confirmResult, setConfirmResult] = useState(null)

  // Payment
  const [paymentResult, setPaymentResult] = useState(null)

  // Initialize LIFF only
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true)
        setAuthError(null)

        // Initialize LIFF
        const loggedIn = await initLiff()
        if (!loggedIn) {
          setLoading(false)
          return
        }

        setLiffStatus(true)

        // Get LINE profile
        const profile = await getProfile()
        if (profile) {
          setLineProfile(profile)
        }
      } catch (error) {
        console.error('Initialization error:', error)
        setAuthError(`Initialization error: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  // Check LIFF status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLiffStatus(isLoggedIn())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleTenantBootstrap = async () => {
    setBootstrapResult(null)
    // Backend requires 'name' parameter - derive from slug or use slug as name
    const requestPayload = {
      slug: tenantSlug,
      name: tenantSlug, // Use slug as name if not provided separately
      ...(tenantLiffId && { liffId: tenantLiffId })
    }
    const { data, error } = await tenantBootstrap(requestPayload)
    setBootstrapResult({ request: requestPayload, response: data, error })
  }

  const handleEnsureProfile = async () => {
    setSetupResult(null)
    const requestPayload = {
      slug: tenantSlug,
      ...(tenantLiffId && { liffId: tenantLiffId })
    }
    const { data, error } = await ensureProfileAndCustomer(requestPayload)
    setSetupResult({ request: requestPayload, response: data, error })
  }

  const handleAvailabilitySearch = async () => {
    setAvailabilityResult(null)
    setSelectedSlot(null)
    const requestPayload = {
      slug: tenantSlug,
      serviceId,
      dateFrom,
      dateTo,
      ...(staffId && { staffId }),
      ...(tenantLiffId && { liffId: tenantLiffId })
    }
    const { data, error } = await availabilitySearch(requestPayload)
    setAvailabilityResult({ 
      request: requestPayload, 
      response: data, 
      error 
    })
  }

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
    if (slot.staffId) setStaffId(slot.staffId)
    if (slot.startAt) {
      // Format startAt for display if needed
      setDateFrom(slot.startAt)
    }
  }

  const handleCreateHold = async () => {
    if (!selectedSlot) {
      alert('Please select a slot from availability search results')
      return
    }
    setHoldResult(null)
    const requestPayload = {
      slug: tenantSlug,
      serviceId,
      staffId: selectedSlot.staffId || staffId,
      startAt: selectedSlot.startAt,
      ...(tenantLiffId && { liffId: tenantLiffId })
    }
    const { data, error } = await createHold(requestPayload)
    setHoldResult({ 
      request: requestPayload, 
      response: data, 
      error 
    })
    if (data?.holdId) {
      setHoldId(data.holdId)
    }
  }

  const handleConfirmBooking = async () => {
    if (!holdId) {
      alert('Please create a hold first')
      return
    }
    setConfirmResult(null)
    const requestPayload = {
      holdId,
      ...(bookingNotes && { notes: bookingNotes })
    }
    const { data, error } = await confirmBooking(requestPayload)
    setConfirmResult({ 
      request: requestPayload, 
      response: data, 
      error 
    })
    if (data?.bookingId) {
      setBookingId(data.bookingId)
    }
    if (data?.paymentId) {
      setPaymentId(data.paymentId)
    }
  }

  const handlePaymentInit = async () => {
    if (!bookingId) {
      alert('Please confirm a booking first')
      return
    }
    setPaymentResult(null)
    const requestPayload = {
      bookingId,
      slug: tenantSlug,
      ...(tenantLiffId && { liffId: tenantLiffId })
    }
    const { data, error } = await paymentInit(requestPayload)
    setPaymentResult({ 
      request: requestPayload, 
      response: data, 
      error 
    })
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Initializing LIFF...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>LIFF Backend Tester</h1>
        <StatusBar 
          liffStatus={liffStatus}
          lineProfile={lineProfile}
        />
        {authError && (
          <div className="error-banner">
            <strong>Error:</strong> {authError}
          </div>
        )}
      </header>

      <main>
        {/* Tenant Context */}
        <section className="test-section">
          <h2>A) Tenant Context</h2>
          <div className="form-group">
            <label>
              Slug:
              <input 
                type="text" 
                value={tenantSlug} 
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="demo"
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              LIFF ID (optional):
              <input 
                type="text" 
                value={tenantLiffId} 
                onChange={(e) => setTenantLiffId(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <button onClick={handleTenantBootstrap} className="action-btn">
            Call tenant_bootstrap
          </button>
          {bootstrapResult && (
            <JsonPanel 
              request={bootstrapResult.request}
              response={bootstrapResult.response}
              error={bootstrapResult.error}
            />
          )}
        </section>

        {/* Setup */}
        <section className="test-section">
          <h2>B) Setup</h2>
          <button onClick={handleEnsureProfile} className="action-btn">
            ensure_profile_and_customer
          </button>
          {setupResult && (
            <JsonPanel 
              request={setupResult.request}
              response={setupResult.response}
              error={setupResult.error}
            />
          )}
        </section>

        {/* Availability */}
        <section className="test-section">
          <h2>C) Availability</h2>
          <div className="form-group">
            <label>
              Service ID:
              <input 
                type="text" 
                value={serviceId} 
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="service-id"
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Staff ID (optional):
              <input 
                type="text" 
                value={staffId} 
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="staff-id"
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Date From:
              <input 
                type="datetime-local" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              Date To:
              <input 
                type="datetime-local" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
          <button onClick={handleAvailabilitySearch} className="action-btn">
            availability_search
          </button>
          {availabilityResult && (
            <>
              <JsonPanel 
                request={availabilityResult.request}
                response={availabilityResult.response}
                error={availabilityResult.error}
              />
              {availabilityResult.response?.slots && (
                <div className="slots-list">
                  <h3>Available Slots (click to select):</h3>
                  {availabilityResult.response.slots.map((slot, idx) => (
                    <div 
                      key={idx} 
                      className={`slot-item ${selectedSlot === slot ? 'selected' : ''}`}
                      onClick={() => handleSlotClick(slot)}
                    >
                      <div>Start: {slot.startAt}</div>
                      {slot.staffId && <div>Staff: {slot.staffId}</div>}
                      {slot.endAt && <div>End: {slot.endAt}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Hold */}
        <section className="test-section">
          <h2>D) Hold</h2>
          {selectedSlot && (
            <div className="info-box">
              <strong>Selected Slot:</strong>
              <pre>{JSON.stringify(selectedSlot, null, 2)}</pre>
            </div>
          )}
          <button onClick={handleCreateHold} className="action-btn" disabled={!selectedSlot}>
            create_hold
          </button>
          {holdResult && (
            <JsonPanel 
              request={holdResult.request}
              response={holdResult.response}
              error={holdResult.error}
            />
          )}
          {holdId && (
            <div className="info-box">
              <strong>Hold ID:</strong> {holdId}
            </div>
          )}
        </section>

        {/* Confirm */}
        <section className="test-section">
          <h2>E) Confirm</h2>
          <div className="form-group">
            <label>
              Notes:
              <textarea 
                value={bookingNotes} 
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Optional booking notes"
                rows={3}
              />
            </label>
          </div>
          <button onClick={handleConfirmBooking} className="action-btn" disabled={!holdId}>
            confirm_booking
          </button>
          {confirmResult && (
            <JsonPanel 
              request={confirmResult.request}
              response={confirmResult.response}
              error={confirmResult.error}
            />
          )}
          {bookingId && (
            <div className="info-box">
              <strong>Booking ID:</strong> {bookingId}
            </div>
          )}
          {paymentId && (
            <div className="info-box">
              <strong>Payment ID:</strong> {paymentId}
            </div>
          )}
        </section>

        {/* Payment Init */}
        <section className="test-section">
          <h2>F) Payment Init (Optional)</h2>
          <button onClick={handlePaymentInit} className="action-btn" disabled={!bookingId}>
            payment_init
          </button>
          {paymentResult && (
            <>
              <JsonPanel 
                request={paymentResult.request}
                response={paymentResult.response}
                error={paymentResult.error}
              />
              {paymentResult.response?.payment_url && (
                <div className="info-box">
                  <strong>Payment URL:</strong>{' '}
                  <a href={paymentResult.response.payment_url} target="_blank" rel="noopener noreferrer">
                    {paymentResult.response.payment_url}
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
