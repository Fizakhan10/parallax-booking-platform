import { format, formatDistanceToNow, isToday, isTomorrow, isPast, isFuture, parseISO } from 'date-fns'

// ── Status config ─────────────────────────────────────────
export const STATUS_CONFIG = {
  pending:   { label: 'Pending',   badge: 'badge-yellow', dot: '#f59e0b' },
  confirmed: { label: 'Confirmed', badge: 'badge-blue',   dot: '#3b82f6' },
  completed: { label: 'Completed', badge: 'badge-green',  dot: '#10b981' },
  cancelled: { label: 'Cancelled', badge: 'badge-red',    dot: '#ef4444' },
  no_show:   { label: 'No Show',   badge: 'badge-gray',   dot: '#94a3b8' },
}

export const ALL_STATUSES = Object.keys(STATUS_CONFIG)

// ── Date helpers ──────────────────────────────────────────
export const fmtDate = (d) => format(parseISO(typeof d === 'string' ? d : d.toISOString()), 'MMM d, yyyy')
export const fmtTime = (d) => format(parseISO(typeof d === 'string' ? d : d.toISOString()), 'h:mm a')
export const fmtDateTime = (d) => format(parseISO(typeof d === 'string' ? d : d.toISOString()), 'MMM d, yyyy · h:mm a')
export const fmtRelative = (d) => formatDistanceToNow(parseISO(typeof d === 'string' ? d : d.toISOString()), { addSuffix: true })

export const getDayLabel = (d) => {
  const date = parseISO(typeof d === 'string' ? d : d.toISOString())
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return fmtDate(d)
}

export const isDue      = (b) => isToday(parseISO(b.startTime))
export const isUpcoming = (b) => isFuture(parseISO(b.startTime))
export const isOverdue  = (b) => isPast(parseISO(b.endTime)) && b.status === 'pending'

// ── Duration ──────────────────────────────────────────────
export const getDuration = (start, end) => {
  const diff = (new Date(end) - new Date(start)) / 60000
  if (diff < 60) return `${diff}m`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Calendar month grid ───────────────────────────────────
export const getCalendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const days = []

  // Padding before
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1)
    days.push({ date: d, currentMonth: false })
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true })
  }
  // Padding after to fill 6 rows
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), currentMonth: false })
  }
  return days
}

// ── Group bookings by date ────────────────────────────────
export const groupByDate = (bookings) => {
  const groups = {}
  bookings.forEach((b) => {
    const key = format(parseISO(b.startTime), 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })
  return groups
}

// ── Zod-style client validation ───────────────────────────
export const validateBookingForm = (form) => {
  const errors = {}
  if (!form.title?.trim())              errors.title       = 'Title is required'
  else if (form.title.trim().length < 2) errors.title       = 'Min. 2 characters'
  if (!form.clientName?.trim())         errors.clientName  = 'Client name is required'
  if (!form.clientEmail?.trim())        errors.clientEmail = 'Client email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) errors.clientEmail = 'Invalid email address'
  if (!form.startTime)                  errors.startTime   = 'Start time is required'
  if (!form.endTime)                    errors.endTime     = 'End time is required'
  else if (form.startTime && new Date(form.endTime) <= new Date(form.startTime))
    errors.endTime = 'End time must be after start time'
  return errors
}

// ── UUID v4 generator (for idempotency key) ───────────────
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
