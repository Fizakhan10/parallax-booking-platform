import { useAuth } from '../../context/AuthContext'
import { Building2, User, Shield, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import styles from './DashboardSettings.module.css'

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className={`btn btn-secondary btn-xs ${styles.copyBtn}`} onClick={handleCopy}>
      {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
    </button>
  )
}

function Field({ label, value, hint, action }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldRow}>
        <input className={`form-input ${styles.fieldInput}`} value={value || ''} readOnly />
        {action}
      </div>
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  )
}

export default function DashboardSettings() {
  const { user, tenant } = useAuth()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your workspace and profile</p>
      </div>

      <div className={styles.grid}>
        {/* Workspace */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Building2 size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2>Workspace</h2>
              <p>Organization-level configuration</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field
              label="Organization name"
              value={tenant?.name}
              hint="Contact support to rename your organization"
            />
            <Field
              label="Subdomain"
              value={`${tenant?.slug}.app.com`}
              hint="Subdomain cannot be changed after creation"
              action={<CopyButton value={`${tenant?.slug}.app.com`} />}
            />
            <Field
              label="Tenant ID"
              value={tenant?.id}
              action={<CopyButton value={tenant?.id} />}
            />
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Plan</div>
              <div className={styles.fieldRow}>
                <input className={`form-input ${styles.fieldInput}`} value={(tenant?.plan || '').toUpperCase()} readOnly />
                <button className="btn btn-primary btn-sm">Upgrade</button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#d1fae5', color: '#059669' }}>
              <User size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2>Your Profile</h2>
              <p>Personal account details</p>
            </div>
          </div>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>
              {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className={styles.profileName}>{user?.fullName}</div>
              <div className={styles.profileEmail}>{user?.email}</div>
              <span className="badge badge-purple" style={{ marginTop: 6 }}>{user?.role}</span>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Full name"  value={user?.fullName} />
            <Field label="Email"      value={user?.email} />
            <Field label="Role"       value={user?.role} />
          </div>
        </section>

        {/* Security */}
        <section className={`${styles.section} ${styles.fullWidth}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Shield size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2>Security Overview</h2>
              <p>Active protections on this workspace</p>
            </div>
          </div>
          <div className={styles.secGrid}>
            {[
              { label: 'MongoDB RBAC',        detail: 'Role-based access control per tenant',     ok: true },
              { label: 'JWT Access Tokens',   detail: '1 hour expiry, signed with HS256',         ok: true },
              { label: 'Refresh Token Rotation', detail: 'Old token revoked on every refresh',   ok: true },
              { label: 'bcrypt Hashing',      detail: '12 salt rounds on all passwords',         ok: true },
              { label: 'Rate Limiting',       detail: '100 requests per 15 minutes per IP',      ok: true },
              { label: 'Helmet.js',           detail: 'Secure HTTP response headers',            ok: true },
              { label: 'CORS Policy',         detail: 'Restricted to known origins only',        ok: true },
              { label: '.env Validation',     detail: 'Server refuses to start if config missing', ok: true },
            ].map(({ label, detail, ok }) => (
              <div key={label} className={styles.secItem}>
                <div className={styles.secDot} style={{ background: ok ? 'var(--success)' : 'var(--warning)' }} />
                <div className={styles.secText}>
                  <div className={styles.secLabel}>{label}</div>
                  <div className={styles.secDetail}>{detail}</div>
                </div>
                <span className={`badge ${ok ? 'badge-green' : 'badge-yellow'}`}>
                  {ok ? 'Active' : 'Dev'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
