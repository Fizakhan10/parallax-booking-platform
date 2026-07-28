import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Search, CalendarDays, List, Filter,
  ChevronLeft, ChevronRight, RefreshCw, X
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { useBookings, useBookingStats } from '../../hooks/useBookings'
import { bookingAPI } from '../../services/api'
import {
  STATUS_CONFIG, ALL_STATUSES, fmtTime, getDayLabel,
  getDuration, getCalendarGrid, groupByDate, isOverdue
} from '../../utils/booking.utils'
import BookingFormModal from '../../components/bookings/BookingFormModal'
import styles from './BookingsPage.module.css'

const VIEWS = ['calendar', 'list']

export default function BookingsPage() {
  const [view, setView]       = useState('calendar')
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [calDate, setCalDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editBooking, setEditBooking] = useState(null)

  // Build query params
  const params = useMemo(() => {
    const p = { limit: 100, sortBy: 'startTime', sortOrder: 'asc' }
    if (statusFilter !== 'all') p.status = statusFilter
    if (search.trim()) p.search = search.trim()
    return p
  }, [statusFilter, search])

  const { bookings, loading, error, refetch } = useBookings(params)
  const { stats } = useBookingStats()

  // Calendar helpers
  const calYear  = calDate.getFullYear()
  const calMonth = calDate.getMonth()
  const calGrid  = useMemo(() => getCalendarGrid(calYear, calMonth), [calYear, calMonth])
  const grouped  = useMemo(() => groupByDate(bookings), [bookings])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking?')) return
    try {
      await bookingAPI.delete(id)
      toast.success('Booking deleted')
      refetch()
    } catch { toast.error('Failed to delete booking') }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await bookingAPI.updateStatus(id, status)
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`)
      refetch()
    } catch { toast.error('Failed to update status') }
  }

  const onFormSuccess = () => {
    setShowForm(false)
    setEditBooking(null)
    refetch()
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bookings</h1>
          <p className={styles.subtitle}>Manage all appointments and sessions</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditBooking(null); setShowForm(true) }}
        >
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { label: 'Total',     value: stats.total,             color: 'var(--gray-800)' },
            { label: 'This Month',value: stats.thisMonth,          color: 'var(--brand-600)' },
            { label: 'Upcoming',  value: stats.upcoming,           color: '#3b82f6' },
            { label: 'Confirmed', value: stats.byStatus.confirmed, color: '#10b981' },
            { label: 'Pending',   value: stats.byStatus.pending,   color: '#f59e0b' },
            { label: 'Cancelled', value: stats.byStatus.cancelled, color: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className={styles.statChip}>
              <span className={styles.statChipVal} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statChipLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <div className="input-icon-wrap" style={{ minWidth: 240 }}>
            <span className="input-icon"><Search size={15} /></span>
            <input
              type="text"
              className="form-input"
              placeholder="Search bookings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className={styles.filterGroup}>
            <Filter size={14} />
            <select
              className={`form-input ${styles.filterSelect}`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* View toggle */}
        <div className={styles.viewToggle}>
          {VIEWS.map((v) => (
            <button
              key={v}
              className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
              onClick={() => setView(v)}
              aria-label={v}
            >
              {v === 'calendar' ? <CalendarDays size={16} /> : <List size={16} />}
              <span>{v === 'calendar' ? 'Calendar' : 'List'}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CALENDAR VIEW
      ══════════════════════════════════════════ */}
      {view === 'calendar' && (
        <div className={styles.calendarWrap}>
          {/* Month nav */}
          <div className={styles.calNav}>
            <button className="btn btn-secondary btn-sm" onClick={() => setCalDate(d => subMonths(d, 1))}>
              <ChevronLeft size={15} />
            </button>
            <h2 className={styles.calTitle}>{format(calDate, 'MMMM yyyy')}</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setCalDate(d => addMonths(d, 1))}>
              <ChevronRight size={15} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCalDate(new Date())}>Today</button>
          </div>

          <div className={styles.calGrid}>
            {/* Day headers */}
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className={styles.calDayHeader}>{d}</div>
            ))}

            {/* Day cells */}
            {calGrid.map(({ date, currentMonth }, idx) => {
              const key    = format(date, 'yyyy-MM-dd')
              const events = grouped[key] || []
              const isToday = key === format(new Date(), 'yyyy-MM-dd')

              return (
                <div
                  key={idx}
                  className={`${styles.calCell} ${!currentMonth ? styles.calCellOff : ''} ${isToday ? styles.calCellToday : ''}`}
                >
                  <div className={styles.calCellDate}>{date.getDate()}</div>
                  <div className={styles.calCellEvents}>
                    {events.slice(0, 3).map((b) => (
                      <Link
                        key={b.id}
                        to={`/dashboard/bookings/${b.id}`}
                        className={styles.calEvent}
                        style={{ borderLeftColor: STATUS_CONFIG[b.status]?.dot }}
                        title={`${b.title} — ${fmtTime(b.startTime)}`}
                      >
                        <span className={styles.calEventTime}>{fmtTime(b.startTime)}</span>
                        <span className={styles.calEventTitle}>{b.title}</span>
                      </Link>
                    ))}
                    {events.length > 3 && (
                      <div className={styles.calMore}>+{events.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LIST VIEW
      ══════════════════════════════════════════ */}
      {view === 'list' && (
        <div className={styles.listWrap}>
          {loading ? (
            <div className={styles.loadingState}><div className="spinner spinner-lg" /></div>
          ) : bookings.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={48} strokeWidth={1} />
              <h3>No bookings found</h3>
              <p>Create your first booking or adjust your filters</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={15} /> New Booking
              </button>
            </div>
          ) : (
            <div className={styles.listTable}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Client</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className={isOverdue(b) ? styles.rowOverdue : ''}>
                        <td>
                          <div className={styles.bookingCell}>
                            <div
                              className={styles.bookingDot}
                              style={{ background: STATUS_CONFIG[b.status]?.dot }}
                            />
                            <div>
                              <Link to={`/dashboard/bookings/${b.id}`} className={styles.bookingTitle}>
                                {b.title}
                              </Link>
                              {b.serviceType && (
                                <div className={styles.bookingService}>{b.serviceType}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.clientCell}>
                            <div className={styles.clientAvatar}>
                              {b.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.clientName}>{b.clientName}</div>
                              <div className={styles.clientEmail}>{b.clientEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.dateCell}>
                            <span className={styles.datePrimary}>{getDayLabel(b.startTime)}</span>
                            <span className={styles.dateSecondary}>{fmtTime(b.startTime)}</span>
                          </div>
                        </td>
                        <td className={styles.durationCell}>
                          {getDuration(b.startTime, b.endTime)}
                        </td>
                        <td>
                          <select
                            className={`badge ${STATUS_CONFIG[b.status]?.badge} ${styles.statusSelect}`}
                            value={b.status}
                            onChange={(e) => handleStatusChange(b.id, e.target.value)}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <Link to={`/dashboard/bookings/${b.id}`} className="btn btn-ghost btn-xs">
                              View
                            </Link>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => { setEditBooking(b); setShowForm(true) }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDelete(b.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {showForm && (
        <BookingFormModal
          booking={editBooking}
          onSuccess={onFormSuccess}
          onClose={() => { setShowForm(false); setEditBooking(null) }}
        />
      )}
    </div>
  )
}
