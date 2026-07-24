import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tenantAPI } from '../services/api'
import {
  Layers, Building2, User, Mail, Lock, ArrowRight,
  CheckCircle2, Circle, Check, ChevronLeft, Eye, EyeOff
} from 'lucide-react'
import styles from './OnboardPage.module.css'

const PLANS = [
  { value: 'free',    label: 'Free',    price: '$0',  period: '/mo', features: ['3 users', 'Basic'] },
  { value: 'starter', label: 'Starter', price: '$9',  period: '/mo', features: ['10 users', 'Analytics'] },
  { value: 'pro',     label: 'Pro',     price: '$29', period: '/mo', features: ['Unlimited', 'Priority support'] },
]

export default function OnboardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    tenantName: '', slug: '', plan: 'free',
    ownerName: '', ownerEmail: '', ownerPassword: '',
  })
  const [slugStatus, setSlugStatus] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const slugTimer = useRef(null)

  const checkSlug = (slug) => {
    clearTimeout(slugTimer.current)
    if (!slug || slug.length < 3) { setSlugStatus('invalid'); return }
    setSlugStatus('checking')
    slugTimer.current = setTimeout(async () => {
      try {
        const { data } = await tenantAPI.checkSlug(slug)
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch { setSlugStatus(null) }
    }, 500)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'slug') {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      setForm(f => ({ ...f, slug: cleaned }))
      checkSlug(cleaned)
      return
    }
    if (name === 'tenantName') {
      const suggested = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setForm(f => ({ ...f, tenantName: value, slug: suggested }))
      checkSlug(suggested)
      return
    }
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleNext = (e) => {
    e.preventDefault()
    setError('')
    if (!form.tenantName.trim()) { setError('Organization name is required.'); return }
    if (!form.slug || form.slug.length < 3) { setError('Subdomain must be at least 3 characters.'); return }
    if (slugStatus === 'taken') { setError('This subdomain is already taken.'); return }
    if (slugStatus === 'checking') { setError('Please wait while we check slug availability.'); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.ownerName.trim()) { setError('Your name is required.'); return }
    if (!form.ownerEmail) { setError('Email is required.'); return }
    if (form.ownerPassword.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      const { data } = await tenantAPI.onboard(form)
      const { accessToken, refreshToken, tenant } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('tenantSlug', tenant.slug)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Onboarding failed.')
    } finally {
      setLoading(false)
    }
  }

  const SlugStatus = () => {
    if (!form.slug) return null
    if (slugStatus === 'checking') return <span className={styles.slugChecking}>Checking…</span>
    if (slugStatus === 'available') return (
      <span className={styles.slugOk}><Check size={12} /> Available</span>
    )
    if (slugStatus === 'taken') return <span className={styles.slugTaken}>Already taken</span>
    if (slugStatus === 'invalid') return <span className={styles.slugHint}>Min. 3 characters</span>
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoMark}><Layers size={17} strokeWidth={2.5} /></div>
            TenantHub
          </Link>
          <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
        </div>

        <div className={styles.content}>
          {/* Steps */}
          <div className={styles.steps}>
            {[
              { n: 1, label: 'Workspace' },
              { n: 2, label: 'Account' },
            ].map((s, i) => (
              <div key={s.n} className={styles.stepRow}>
                <div className={`${styles.stepDot} ${step > s.n ? styles.stepDone : step === s.n ? styles.stepActive : styles.stepPending}`}>
                  {step > s.n
                    ? <CheckCircle2 size={20} />
                    : step === s.n
                      ? <div className={styles.stepActiveDot} />
                      : <Circle size={20} />
                  }
                </div>
                <span className={`${styles.stepLabel} ${step === s.n ? styles.stepLabelActive : ''}`}>{s.label}</span>
                {i < 1 && <div className={styles.stepLine} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h1>{step === 1 ? 'Set up your workspace' : 'Create your account'}</h1>
              <p>{step === 1
                ? 'Choose a name and subdomain for your organization.'
                : 'You\'ll be the owner and administrator of this workspace.'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleNext} className={styles.form}>
                <div className="form-group">
                  <label className="form-label" htmlFor="tenantName">Organization name</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><Building2 size={15} /></span>
                    <input
                      id="tenantName"
                      name="tenantName"
                      type="text"
                      className="form-input"
                      placeholder="Acme Corporation"
                      value={form.tenantName}
                      onChange={handleChange}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="slug">
                    Subdomain
                    <SlugStatus />
                  </label>
                  <div className="slug-combo">
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      placeholder="acme"
                      value={form.slug}
                      onChange={handleChange}
                      required
                    />
                    <span className="slug-suffix">.app.com</span>
                  </div>
                  <p className="form-hint">Lowercase letters, numbers, and hyphens only</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <div className={styles.plans}>
                    {PLANS.map((p) => (
                      <label key={p.value} className={`${styles.planOption} ${form.plan === p.value ? styles.planActive : ''}`}>
                        <input type="radio" name="plan" value={p.value}
                          checked={form.plan === p.value} onChange={handleChange}
                          style={{ display: 'none' }} />
                        <div className={styles.planCheck}>
                          {form.plan === p.value
                            ? <CheckCircle2 size={16} />
                            : <Circle size={16} />
                          }
                        </div>
                        <div className={styles.planLabel}>{p.label}</div>
                        <div className={styles.planPrice}>{p.price}<span>{p.period}</span></div>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-block">
                  Continue
                  <ArrowRight size={15} />
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Workspace recap */}
                <div className={styles.recap}>
                  <div className={styles.recapIcon}><Building2 size={15} /></div>
                  <div className={styles.recapText}>
                    <div className={styles.recapName}>{form.tenantName}</div>
                    <div className={styles.recapSlug}>{form.slug}.app.com · {form.plan} plan</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => { setStep(1); setError('') }}>
                    <ChevronLeft size={14} /> Edit
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ownerName">Your full name</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><User size={15} /></span>
                    <input id="ownerName" name="ownerName" type="text"
                      className="form-input" placeholder="Jane Doe"
                      value={form.ownerName} onChange={handleChange}
                      required autoFocus />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ownerEmail">Email address</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon"><Mail size={15} /></span>
                    <input id="ownerEmail" name="ownerEmail" type="email"
                      className="form-input" placeholder="jane@acme.com"
                      value={form.ownerEmail} onChange={handleChange}
                      required autoComplete="email" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ownerPassword">Password</label>
                  <div className={styles.passwordWrap}>
                    <div className="input-icon-wrap" style={{ flex: 1 }}>
                      <span className="input-icon"><Lock size={15} /></span>
                      <input id="ownerPassword" name="ownerPassword"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input" placeholder="Min. 8 characters"
                        value={form.ownerPassword} onChange={handleChange}
                        required autoComplete="new-password"
                        style={{ paddingRight: 40 }} />
                    </div>
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                  {loading
                    ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creating workspace…</>
                    : <>Create workspace <ArrowRight size={15} /></>
                  }
                </button>
              </form>
            )}
          </div>

          <p className={styles.footerNote}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
