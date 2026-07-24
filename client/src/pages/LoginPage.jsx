import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layers, Mail, Lock, ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [tenantSlug, setTenantSlug] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!tenantSlug.trim()) { setError('Please enter your workspace subdomain.'); return }

    setLoading(true)
    localStorage.setItem('tenantSlug', tenantSlug.trim().toLowerCase())
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
      localStorage.removeItem('tenantSlug')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel}>
        <div className={styles.panelContent}>
          <Link to="/" className={styles.panelLogo}>
            <div className={styles.logoMark}><Layers size={20} strokeWidth={2.5} /></div>
            TenantHub
          </Link>
          <div className={styles.panelBody}>
            <h2>Secure, isolated workspaces for every team</h2>
            <p>Your data lives in its own tenant — completely isolated from every other workspace on the platform.</p>
            <div className={styles.panelPoints}>
              {[
                'JWT authentication with token rotation',
                'Role-based access control',
                'Subdomain-based tenant routing',
                'MongoDB RBAC data isolation',
              ].map((t) => (
                <div key={t} className={styles.panelPoint}>
                  <div className={styles.panelPointDot} />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.panelFooter}>
            Multi-tenant SaaS · Paralax Lab Internship
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className={styles.formSide}>
        <div className={styles.formBox}>
          <Link to="/" className={styles.mobileLogo}>
            <div className={styles.logoMark}><Layers size={16} strokeWidth={2.5} /></div>
            TenantHub
          </Link>

          <div className={styles.formHeader}>
            <h1>Welcome back</h1>
            <p>Sign in to your workspace</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <Lock size={15} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="slug">Workspace</label>
              <div className="slug-combo">
                <Building2 size={15} style={{ margin: '0 4px 0 12px', color: 'var(--gray-400)', flexShrink: 0 }} />
                <input
                  id="slug"
                  type="text"
                  placeholder="your-workspace"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  autoComplete="organization"
                />
                <span className="slug-suffix">.app.com</span>
              </div>
              <p className="form-hint">Enter your workspace slug (e.g. acme, techstart)</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Mail size={15} /></span>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className={styles.passwordWrap}>
                <div className="input-icon-wrap" style={{ flex: 1 }}>
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading
                ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Signing in…</>
                : <>Sign in <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div className={styles.demoBox}>
            <div className={styles.demoLabel}>Demo credentials</div>
            <div className={styles.demoGrid}>
              {[
                { slug: 'acme', email: 'admin@acme.com', role: 'Owner' },
                { slug: 'techstart', email: 'ceo@techstart.com', role: 'Owner' },
              ].map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  className={styles.demoItem}
                  onClick={() => {
                    setTenantSlug(d.slug)
                    setForm({ email: d.email, password: 'password123' })
                  }}
                >
                  <div className={styles.demoSlug}>{d.slug}</div>
                  <div className={styles.demoEmail}>{d.email}</div>
                  <span className="badge badge-purple">{d.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className={styles.formFooter}>
            No workspace yet? <Link to="/onboard">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
