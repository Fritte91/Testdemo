import { useState, useEffect } from 'react'
import { initLiff, isLoggedIn, getProfile } from './lib/liffAuth'
import { supabase } from './lib/supabase'
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

  // Tenant
  const [tenantSlug, setTenantSlug] = useState(import.meta.env.VITE_TENANT_SLUG || 'demo-salon')
  const [tenant, setTenant] = useState(null)
  const [profileSetup, setProfileSetup] = useState(false)

  // Services & Staff
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [loadingServices, setLoadingServices] = useState(false)

  // Booking Flow
  const [selectedService, setSelectedService] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [availabilityResult, setAvailabilityResult] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Booking State
  const [holdId, setHoldId] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')

  // Results
  const [currentResult, setCurrentResult] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  // Initialize and auto-setup
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

        // Auto-load tenant
        await loadTenant()
        
        // Wait a bit for tenant to load
        await new Promise(resolve => setTimeout(resolve, 500))

        // Auto-setup profile
        await setupProfile()

        // Load services and staff (after tenant is loaded)
        await loadServicesAndStaff()
      } catch (error) {
        console.error('Initialization error:', error)
        setAuthError(`Initialization error: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  // Auto-set date range (next 7 days)
  useEffect(() => {
    const now = new Date()
    const from = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    setDateFrom(formatDate(from))
    setDateTo(formatDate(to))
  }, [])

  // Check LIFF status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLiffStatus(isLoggedIn())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadTenant = async () => {
    try {
      const { data, error } = await tenantBootstrap({ slug: tenantSlug, name: tenantSlug })
      if (error) {
        console.error('Failed to load tenant:', error)
        return
      }
      if (data?.tenant) {
        setTenant(data.tenant)
      }
    } catch (error) {
      console.error('Error loading tenant:', error)
    }
  }

  const setupProfile = async () => {
    try {
      const { data, error } = await ensureProfileAndCustomer({ slug: tenantSlug })
      if (error) {
        console.error('Failed to setup profile:', error)
        return
      }
      if (data) {
        setProfileSetup(true)
      }
    } catch (error) {
      console.error('Error setting up profile:', error)
    }
  }

  const loadServicesAndStaff = async () => {
    if (!tenant) return
    
    setLoadingServices(true)
    try {
      // Query services directly from Supabase
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name')

      if (servicesError) {
        console.error('Error loading services:', servicesError)
      } else if (servicesData) {
        setServices(servicesData)
      }

      // Query staff directly from Supabase
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name')

      if (staffError) {
        console.error('Error loading staff:', staffError)
      } else if (staffData) {
        setStaff(staffData)
      }
    } catch (error) {
      console.error('Error loading services/staff:', error)
    } finally {
      setLoadingServices(false)
    }
  }

  const handleSearchAvailability = async () => {
    if (!selectedService) {
      alert('Please select a service')
      return
    }

    if (!dateFrom || !dateTo) {
      alert('Please select date range')
      return
    }

    setAvailabilityResult(null)
    setSelectedSlot(null)
    
    const requestPayload = {
      slug: tenantSlug,
      serviceId: selectedService,
      dateFrom,
      dateTo,
      ...(selectedStaff && { staffId: selectedStaff })
    }

    const { data, error } = await availabilitySearch(requestPayload)
    setAvailabilityResult({ request: requestPayload, response: data, error })
    setCurrentResult({ request: requestPayload, response: data, error })
  }

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
  }

  const handleCreateHold = async () => {
    if (!selectedSlot) {
      alert('Please select a time slot')
      return
    }

    const requestPayload = {
      slug: tenantSlug,
      serviceId: selectedService,
      staffId: selectedSlot.staffId || selectedStaff,
      startAt: selectedSlot.startAt
    }

    const { data, error } = await createHold(requestPayload)
    setCurrentResult({ request: requestPayload, response: data, error })
    
    if (data?.holdId) {
      setHoldId(data.holdId)
    } else if (error) {
      alert(`Failed to create hold: ${error.message || JSON.stringify(error)}`)
    }
  }

  const handleConfirmBooking = async () => {
    if (!holdId) {
      alert('Please create a hold first')
      return
    }

    const requestPayload = {
      holdId,
      ...(bookingNotes && { notes: bookingNotes })
    }

    const { data, error } = await confirmBooking(requestPayload)
    setCurrentResult({ request: requestPayload, response: data, error })
    
    if (data?.bookingId) {
      setBookingId(data.bookingId)
      if (data?.paymentId) {
        setPaymentId(data.paymentId)
      }
    } else if (error) {
      alert(`Failed to confirm booking: ${error.message || JSON.stringify(error)}`)
    }
  }

  const handlePaymentInit = async () => {
    if (!bookingId) {
      alert('Please confirm a booking first')
      return
    }

    const requestPayload = {
      bookingId,
      slug: tenantSlug
    }

    const { data, error } = await paymentInit(requestPayload)
    setCurrentResult({ request: requestPayload, response: data, error })
    
    if (data?.payment_url) {
      window.open(data.payment_url, '_blank')
    } else if (error) {
      alert(`Failed to initialize payment: ${error.message || JSON.stringify(error)}`)
    }
  }

  const handleQuickDemo = async () => {
    // Auto-select first service if available
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].id)
    }

    // Wait a bit then search
    setTimeout(() => {
      if (selectedService || services.length > 0) {
        handleSearchAvailability()
      }
    }, 500)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Initializing...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>📅 Booking Demo</h1>
        <StatusBar 
          liffStatus={liffStatus}
          lineProfile={lineProfile}
        />
        {tenant && (
          <div className="info-box" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <div>
                <strong>Tenant:</strong> {tenant.name} ({tenant.slug})
                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                  ID: {tenant.id}
                </div>
              </div>
              <button 
                onClick={() => {
                  const newSlug = prompt('Enter tenant slug:', tenantSlug)
                  if (newSlug && newSlug !== tenantSlug) {
                    setTenantSlug(newSlug)
                    setTenant(null)
                    setServices([])
                    setStaff([])
                    setProfileSetup(false)
                    loadTenant().then(() => {
                      setTimeout(() => {
                        setupProfile()
                        loadServicesAndStaff()
                      }, 500)
                    })
                  }
                }}
                style={{ 
                  padding: '5px 10px', 
                  fontSize: '0.85em', 
                  background: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Change
              </button>
            </div>
            {profileSetup && <span style={{ marginLeft: '10px', color: '#28a745' }}>✓ Profile Ready</span>}
            {services.length > 0 && <span style={{ marginLeft: '10px', color: '#28a745' }}>✓ {services.length} Services</span>}
            {staff.length > 0 && <span style={{ marginLeft: '10px', color: '#28a745' }}>✓ {staff.length} Staff</span>}
          </div>
        )}
        {authError && (
          <div className="error-banner">
            <strong>Error:</strong> {authError}
          </div>
        )}
      </header>

      <main>
        {/* Quick Actions */}
        <section className="test-section">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
            <button onClick={handleQuickDemo} className="action-btn" style={{ flex: 1 }}>
              🚀 Quick Demo - Find Available Times
            </button>
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className="action-btn" 
              style={{ background: showDebug ? '#28a745' : '#6c757d' }}
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          </div>
        </section>

        {/* Service Selection */}
        <section className="test-section">
          <h2>1. Select Service</h2>
          {loadingServices ? (
            <div>Loading services...</div>
          ) : services.length > 0 ? (
            <div className="form-group">
              <label>
                Service:
                <select 
                  value={selectedService} 
                  onChange={(e) => setSelectedService(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="">-- Select a service --</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} {service.duration && `(${service.duration} min)`} {service.price && `- ${service.price} THB`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="info-box">
              <p>No services found. You can still enter a Service ID manually:</p>
              <input 
                type="text" 
                value={selectedService} 
                onChange={(e) => setSelectedService(e.target.value)}
                placeholder="Enter service ID"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          )}

          {staff.length > 0 && (
            <div className="form-group">
              <label>
                Staff (Optional):
                <select 
                  value={selectedStaff} 
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="">-- Any staff --</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.display_name || s.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {/* Date Selection */}
        <section className="test-section">
          <h2>2. Select Date Range</h2>
          <div className="form-group">
            <label>
              From:
              <input 
                type="datetime-local" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
          </div>
          <div className="form-group">
            <label>
              To:
              <input 
                type="datetime-local" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
          </div>
          <button 
            onClick={handleSearchAvailability} 
            className="action-btn"
            disabled={!selectedService || !dateFrom || !dateTo}
          >
            🔍 Search Available Times
          </button>
        </section>

        {/* Available Slots */}
        {availabilityResult && (
          <section className="test-section">
            <h2>3. Select Time Slot</h2>
            {availabilityResult.error ? (
              <div className="error-banner">
                <strong>Error:</strong> {availabilityResult.error.message || JSON.stringify(availabilityResult.error)}
              </div>
            ) : availabilityResult.response?.slots?.length > 0 ? (
              <div className="slots-list">
                {availabilityResult.response.slots.map((slot, idx) => (
                  <div 
                    key={idx} 
                    className={`slot-item ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => handleSlotClick(slot)}
                  >
                    <div><strong>{new Date(slot.startAt).toLocaleString()}</strong></div>
                    {slot.endAt && <div>Until: {new Date(slot.endAt).toLocaleString()}</div>}
                    {slot.staffId && <div>Staff ID: {slot.staffId}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="info-box">No available slots found for the selected criteria.</div>
            )}
          </section>
        )}

        {/* Booking Actions */}
        {selectedSlot && (
          <>
            <section className="test-section">
              <h2>4. Create Hold</h2>
              <div className="info-box">
                <strong>Selected:</strong> {new Date(selectedSlot.startAt).toLocaleString()}
              </div>
              <button onClick={handleCreateHold} className="action-btn">
                🔒 Create Hold
              </button>
              {holdId && (
                <div className="info-box" style={{ marginTop: '10px', background: '#d4edda' }}>
                  ✓ Hold created! ID: {holdId}
                </div>
              )}
            </section>

            {holdId && (
              <section className="test-section">
                <h2>5. Confirm Booking</h2>
                <div className="form-group">
                  <label>
                    Notes (optional):
                    <textarea 
                      value={bookingNotes} 
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Any special requests?"
                      rows={3}
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </label>
                </div>
                <button onClick={handleConfirmBooking} className="action-btn">
                  ✅ Confirm Booking
                </button>
                {bookingId && (
                  <div className="info-box" style={{ marginTop: '10px', background: '#d4edda' }}>
                    ✓ Booking confirmed! ID: {bookingId}
                    {paymentId && <div>Payment ID: {paymentId}</div>}
                  </div>
                )}
              </section>
            )}

            {bookingId && (
              <section className="test-section">
                <h2>6. Initialize Payment</h2>
                <button onClick={handlePaymentInit} className="action-btn">
                  💳 Initialize Payment
                </button>
              </section>
            )}
          </>
        )}

        {/* Debug Panel */}
        {showDebug && currentResult && (
          <section className="test-section">
            <h2>🔧 Debug Info</h2>
            <JsonPanel 
              request={currentResult.request}
              response={currentResult.response}
              error={currentResult.error}
            />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
