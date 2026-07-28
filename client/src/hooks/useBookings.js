import { useState, useEffect, useCallback, useRef } from 'react'
import { bookingAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * useBookings — fetches + caches the booking list with retry logic
 */
export function useBookings(params = {}) {
  const [bookings, setBookings]     = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const retryCount                  = useRef(0)
  const MAX_RETRIES                 = 2

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data } = await bookingAPI.list(params)
      setBookings(data.data.bookings)
      setPagination(data.data.pagination)
      retryCount.current = 0
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load bookings'
      setError(msg)
      // Automatic retry with exponential backoff (max 2 retries)
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++
        const delay = 1000 * Math.pow(2, retryCount.current)
        setTimeout(() => fetch(true), delay)
      } else {
        toast.error(msg)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { bookings, pagination, loading, error, refetch: fetch }
}

/**
 * useBookingStats — fetches dashboard stats
 */
export function useBookingStats() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bookingAPI.stats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
