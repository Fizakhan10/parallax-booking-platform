import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Calendar, Clock, MapPin, User, Mail, Phone,
  Tag, FileText, Edit2, Trash2, CheckCircle2, XCircle,
  RefreshCw, Building2
} from 'lucide-react'
import { bookingAPI } from '../../services/api'
import {
  STATUS_CONFIG, ALL_STATUSES,
  fmtDate, fmtTime, fmtRelative, getDuration
} from '../../utils/booking.utils'
import BookingFormModal from '../../components/bookings/BookingFormModal'
import CollaborativeEditor from '../../components/collaboration/CollaborativeEditor'
import styles from './BookingDetailPage.module.css'

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  // Auto-save collaborative notes back to the booking record
  const handleNotesSave = useCallback(async (plainText) => {
    try { await bookingAPI.update(id, { notes: plainText }) }
    catch (err) { console.warn('[BookingDetailPage] Notes save failed:', err.message) }
  }, [id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await bookingAPI.get(id)
      setBooking(data.data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (status) => {
    setStatusLoading(true)
    try {
      const { data } = await bookingAPI.updateStatus(id, status)
      setBooking(data.data)
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`)
    } catch { toast.error('Failed to update status') }
    finally { setStatusLoading(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this booking? This cannot be undone.')) return
    try {
      await bookingAPI.delete(id)
      toast.success('Booking deleted')
      navigate('/dashboard/bookings')
    } catch { toast.error('Failed to delete booking') }
  }

  if (loading) return (
    <div className={styles.loadingPage}><div className="spinner spinner-lg" /></div>
  )
  if (error) return (
    <div className={styles.errorPage}>
      <div className="alert alert-error">{error}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Retry</button>
        <Link to="/dashboard/bookings" className="btn btn-ghost"><ArrowLeft size={14} /> Back</Link>
      </div>
    </div>
  )
  if (!booking) return null

  const cfg = STATUS_CONFIG[booking.status] || {}

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard/bookings" className={styles.backLink}>
          <ArrowLeft size={15} /> Bookings
        </Link>
        <span>/</span>
        <span className={styles.breadcrumbCurrent}>{booking.title}</span>
      </div>

      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.statusDot} style={{ background: cfg.dot }} />
          <div>
            <h1 className={styles.title}>{booking.title}</h1>
            <p className={styles.meta}>
              Created {fmtRelative(booking.createdAt)}
              {booking.createdBy?.fullName && ` by ${booking.createdBy.fullName}`}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowEdit(true)}
          >
            <Edit2 size={14} /> Edit
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Main details ── */}
        <div className={styles.mainCol}>
          {/* Status card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className={styles.sectionTitle}>Status</div>
            <div className={styles.statusRow}>
              <span className={`badge ${cfg.badge}`} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                {cfg.label}
              </span>
              <div className={styles.statusActions}>
                {ALL_STATUSES.filter(s => s !== booking.status).map(s => (
                  <button
                    key={s}
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleStatusChange(s)}
                    disabled={statusLoading}
                  >
                    {statusLoading ? <span className="spinner spinner-sm" /> : STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className={styles.sectionTitle}>Scheduling</div>
            <div className={styles.detailGrid}>
              <DetailRow icon={<Calendar size={15} />} label="Date" value={fmtDate(booking.startTime)} />
              <DetailRow icon={<Clock size={15} />}    label="Start" value={fmtTime(booking.startTime)} />
              <DetailRow icon={<Clock size={15} />}    label="End"   value={fmtTime(booking.endTime)} />
              <DetailRow icon={<Clock size={15} />}    label="Duration" value={getDuration(booking.startTime, booking.endTime)} />
              {booking.location && (
                <DetailRow icon={<MapPin size={15} />} label="Location" value={booking.location} />
              )}
              {booking.serviceType && (
                <DetailRow icon={<Tag size={15} />}    label="Service" value={booking.serviceType} />
              )}
            </div>
          </div>

          {/* Description */}
          {booking.description && (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className={styles.sectionTitle}>Description</div>
              <p className={styles.bodyText}>{booking.description}</p>
            </div>
          )}

          {/* Collaborative Notes Editor */}
          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--gray-100)' }}>
              <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>Internal Notes</div>
            </div>
            <CollaborativeEditor
              bookingId={booking.id}
              initialContent={booking.notes || ''}
              onSave={handleNotesSave}
            />
          </div>
        </div>

        {/* ── Client sidebar ── */}
        <div className={styles.sideCol}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className={styles.sectionTitle}>Client</div>
            <div className={styles.clientHeader}>
              <div className={styles.clientAvatar}>
                {booking.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={styles.clientName}>{booking.clientName}</div>
              </div>
            </div>
            <div className={styles.clientDetails}>
              <DetailRow icon={<Mail size={14} />} label="Email" value={
                <a href={`mailto:${booking.clientEmail}`} className={styles.link}>{booking.clientEmail}</a>
              } />
              {booking.clientPhone && (
                <DetailRow icon={<Phone size={14} />} label="Phone" value={
                  <a href={`tel:${booking.clientPhone}`} className={styles.link}>{booking.clientPhone}</a>
                } />
              )}
            </div>
          </div>

          {/* Idempotency / meta */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className={styles.sectionTitle}>System Info</div>
            <div className={styles.metaList}>
              <DetailRow icon={<FileText size={14} />} label="Booking ID" value={
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{booking.id.slice(0, 12)}…</span>
              } />
              {booking.idempotencyKey && (
                <DetailRow icon={<CheckCircle2 size={14} />} label="Idempotent" value={
                  <span className="badge badge-green">Yes</span>
                } />
              )}
              <DetailRow icon={<Calendar size={14} />} label="Created" value={fmtDate(booking.createdAt)} />
              <DetailRow icon={<Calendar size={14} />} label="Updated" value={fmtRelative(booking.updatedAt)} />
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <BookingFormModal
          booking={booking}
          onSuccess={() => { setShowEdit(false); load() }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <div className={styles.detailRow}>
      <div className={styles.detailIcon}>{icon}</div>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}
