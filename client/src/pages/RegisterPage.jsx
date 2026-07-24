import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layers, Mail, Lock, User, ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [tenantSlug, setTenantSlug] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!tenantSlug.trim()) { setError('Workspace subdomain is required.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    localStorage.setItem('tenantSlug', tenantSlug.trim().toLowerCase())
    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed.')
      localStorage.removeItem('tenantSlug')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.panelContent}>
          <Link to="/" className={styles.panelLogo}>
            <div className={styles.logoMark}><Layers size={20} strokeWidth={2.5} /></div>
            TenantHub
          </Link>
          <div className={styles.panelBody}>
            <h2>Join your team's workspace</h2>
            <p>Register to join an existing workspace. Each user belongs to exactly one tenant — keeping data perfectly isolated.</p>
          </div>
          <div className={styles.panelFooter}>
            Want your own workspace? <Link to="/onboard" style={{ color: '#818cf8' }}>Create one →</Link>
          </div>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formBox}>
          <Link to="/" className={styles.mobileLogo}>
            <div className={styles.logoMark}><Layers size={16} strokeWidth={2.5} /></div>
            TenantHub
          </Link>

          <div className={styles.formHeader}>
            <h1>Create account</h1>
            <p>Join your team's workspace</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <Lock size={15} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className="form-group">
              <label className="form-label">Workspace</label>
              <div className="slug-combo">
                <Building2 size={15} style={{ margin: '0 4px 0 12px', color: 'var(--gray-400)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="your-workspace"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
                <span className="slug-suffix">.app.com</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full name</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><User size={15} /></span>
                <input id="reg-name" type="text" className="form-input"
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email address</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Mail size={15} /></span>
                <input id="reg-email" type="email" className="form-input"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  required autoComplete="email" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-pass">Password</label>
              <div className={styles.passwordWrap}>
                <div className="input-icon-wrap" style={{ flex: 1 }}>
                  <span className="input-icon"><Lock size={15} /></span>
                  <input id="reg-pass" type={showPassword ? 'text' : 'password'}
                    className="form-input" placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    required autoComplete="new-password" style={{ paddingRight: 40 }} />
                </div>
                <button type="button" className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Lock size={15} /></span>
                <input id="reg-confirm" type="password" className="form-input"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading
                ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creating account…</>
                : <>Create account <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className={styles.formFooter}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
