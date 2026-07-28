import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Mail, Phone, MapPin, Tag, FileText, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { bookingAPI } from '../../services/api'
import { validateBookingForm, generateUUID, ALL_STATUSES, STATUS_CONFIG } from '../../utils/booking.utils'
import styles from './BookingFormModal.module.css'

const toLocalInput = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

const fromLocalInput = (localStr) => {
  if (!localStr) return ''
  return new Date(localStr).toISOString()
}

export default function BookingFormModal({ booking, onSuccess, onClose }) {
  const isEdit = Boolean(booking)

  const [form, setForm] = useState({
    title:       '',
    description: '',
    clientName:  '',
    clientEmail: '',
    clientPhone: '',
    startTime:   '',
    endTime:     '',
    location:    '',
    serviceType: '',
    notes:       '',
    status:      'pending',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (booking) {
      setForm({
        title:       booking.title       || '',
        description: booking.description || '',
        clientName:  booking.clientName  || '',
        clientEmail: booking.clientEmail || '',
        clientPhone: booking.clientPhone || '',
        startTime:   toLocalInput(booking.startTime),
        endTime:     toLocalInput(booking.endTime),
        location:    booking.location    || '',
        serviceType: booking.serviceType || '',
        notes:       booking.notes       || '',
        status:      booking.status      || 'pending',
      })
    } else {
      // Default: start in 1 hour, end in 2 hours
      const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1)
      const end   = new Date(start); end.setHours(end.getHours() + 1)
      setForm(f => ({ ...f, startTime: format(start, "yyyy-MM-dd'T'HH:mm"), endTime: format(end, "yyyy-MM-dd'T'HH:mm") }))
    }
  }, [booking])

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validateBookingForm({
      ...form,
      startTime: fromLocalInput(form.startTime),
      endTime:   fromLocalInput(form.endTime),
    })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    const payload = {
      ...form,
      startTime: fromLocalInput(form.startTime),
      endTime:   fromLocalInput(form.endTime),
    }
    if (!isEdit) payload.idempotencyKey = generateUUID()

    try {
      if (isEdit) {
        await bookingAPI.update(booking.id, payload)
        toast.success('Booking updated successfully')
      } else {
        await bookingAPI.create(payload)
        toast.success('Booking created successfully')
      }
      onSuccess()
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} booking`
      const serverErrors = err.response?.data?.errors
      if (serverErrors?.length) {
        const errMap = {}
        serverErrors.forEach(e => { if (e.field) errMap[e.field] = e.message })
        setErrors(errMap)
        toast.error('Please fix the validation errors')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit booking' : 'New booking'}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{isEdit ? 'Edit Booking' : 'New Booking'}</h2>
            <p className={styles.modalSubtitle}>{isEdit ? 'Update booking details' : 'Schedule a new appointment'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formBody}>
            {/* Title */}
            <div className={`form-group ${styles.fullWidth}`}>
              <label className="form-label" htmlFor="bk-title">
                <Tag size={13} /> Booking Title *
              </label>
              <input
                id="bk-title"
                type="text"
                className={`form-input ${errors.title ? 'is-error' : ''}`}
                placeholder="e.g. Strategy Consultation"
                value={form.title}
                onChange={set('title')}
                autoFocus
              />
              {errors.title && <p className="form-error"><AlertCircle size={12} />{errors.title}</p>}
            </div>

            {/* Client Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-cname">
                <User size={13} /> Client Name *
              </label>
              <input
                id="bk-cname"
                type="text"
                className={`form-input ${errors.clientName ? 'is-error' : ''}`}
                placeholder="Jane Doe"
                value={form.clientName}
                onChange={set('clientName')}
              />
              {errors.clientName && <p className="form-error"><AlertCircle size={12} />{errors.clientName}</p>}
            </div>

            {/* Client Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-cemail">
                <Mail size={13} /> Client Email *
              </label>
              <input
                id="bk-cemail"
                type="email"
                className={`form-input ${errors.clientEmail ? 'is-error' : ''}`}
                placeholder="jane@example.com"
                value={form.clientEmail}
                onChange={set('clientEmail')}
              />
              {errors.clientEmail && <p className="form-error"><AlertCircle size={12} />{errors.clientEmail}</p>}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-cphone">
                <Phone size={13} /> Client Phone
              </label>
              <input
                id="bk-cphone"
                type="tel"
                className="form-input"
                placeholder="+1-555-0000"
                value={form.clientPhone}
                onChange={set('clientPhone')}
              />
            </div>

            {/* Start Time */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-start">
                <Calendar size={13} /> Start Time *
              </label>
              <input
                id="bk-start"
                type="datetime-local"
                className={`form-input ${errors.startTime ? 'is-error' : ''}`}
                value={form.startTime}
                onChange={set('startTime')}
              />
              {errors.startTime && <p className="form-error"><AlertCircle size={12} />{errors.startTime}</p>}
            </div>

            {/* End Time */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-end">
                <Clock size={13} /> End Time *
              </label>
              <input
                id="bk-end"
                type="datetime-local"
                className={`form-input ${errors.endTime ? 'is-error' : ''}`}
                value={form.endTime}
                onChange={set('endTime')}
              />
              {errors.endTime && <p className="form-error"><AlertCircle size={12} />{errors.endTime}</p>}
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-loc">
                <MapPin size={13} /> Location
              </label>
              <input
                id="bk-loc"
                type="text"
                className="form-input"
                placeholder="Zoom, Office Room 3, etc."
                value={form.location}
                onChange={set('location')}
              />
            </div>

            {/* Service Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="bk-service">
                <Tag size={13} /> Service Type
              </label>
              <input
                id="bk-service"
                type="text"
                className="form-input"
                placeholder="Consultation, Design Review…"
                value={form.serviceType}
                onChange={set('serviceType')}
              />
            </div>

            {/* Status (edit only) */}
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className={`form-group ${styles.fullWidth}`}>
              <label className="form-label" htmlFor="bk-desc">
                <FileText size={13} /> Description
              </label>
              <textarea
                id="bk-desc"
                className="form-input"
                rows={2}
                placeholder="Brief overview of the session…"
                value={form.description}
                onChange={set('description')}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Notes */}
            <div className={`form-group ${styles.fullWidth}`}>
              <label className="form-label" htmlFor="bk-notes">
                <FileText size={13} /> Internal Notes
              </label>
              <textarea
                id="bk-notes"
                className="form-input"
                rows={2}
                placeholder="Private notes visible only to your team…"
                value={form.notes}
                onChange={set('notes')}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</>
                : isEdit ? 'Save Changes' : 'Create Booking'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
