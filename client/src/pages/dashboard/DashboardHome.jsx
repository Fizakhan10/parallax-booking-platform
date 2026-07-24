import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dashboardAPI } from '../../services/api'
import {
  Users, UserCheck, Building2, Shield,
  TrendingUp, ArrowRight, Activity
} from 'lucide-react'
import styles from './DashboardHome.module.css'

const PLAN_BADGE = {
  free: 'badge-gray',
  starter: 'badge-blue',
  pro: 'badge-purple',
  enterprise: 'badge-green',
}

export default function DashboardHome() {
  const { user, tenant } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardAPI.stats()
      .then(({ data }) => setStats(data.data))
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{greeting}, {user?.fullName?.split(' ')[0]}</h1>
          <p className={styles.pageSubtitle}>
            Here's what's happening in your workspace today.
          </p>
        </div>
        <span className={`badge ${PLAN_BADGE[tenant?.plan] || 'badge-gray'}`}>
          {tenant?.plan} plan
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className={styles.loader}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className={styles.statsGrid}>
            {[
              {
                label: 'Total Users',
                value: stats?.totalUsers ?? '–',
                icon: Users,
                iconBg: '#ede9fe',
                iconColor: '#7c3aed',
                trend: null,
              },
              {
                label: 'Active Users',
                value: stats?.activeUsers ?? '–',
                icon: UserCheck,
                iconBg: '#d1fae5',
                iconColor: '#059669',
                trend: stats ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active` : null,
              },
              {
                label: 'Workspace',
                value: tenant?.name,
                icon: Building2,
                iconBg: '#dbeafe',
                iconColor: '#2563eb',
                valueSmall: true,
              },
              {
                label: 'Your Role',
                value: user?.role,
                icon: Shield,
                iconBg: '#fef3c7',
                iconColor: '#d97706',
                valueSmall: true,
              },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statCardTop}>
                    <div className={styles.statLabel}>{s.label}</div>
                    <div className={styles.statIconWrap}
                      style={{ background: s.iconBg, color: s.iconColor }}>
                      <Icon size={17} strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className={`${styles.statValue} ${s.valueSmall ? styles.statValueSm : ''}`}>
                    {s.value}
                  </div>
                  {s.trend && (
                    <div className={styles.statTrend}>
                      <TrendingUp size={12} />
                      {s.trend}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Content row */}
          <div className={styles.contentRow}>
            {/* Workspace details */}
            <div className="card">
              <div className={styles.cardHead}>
                <h3>Workspace Details</h3>
              </div>
              <div className={styles.detailList}>
                {[
                  { label: 'Tenant ID',  value: `${tenant?.id?.slice(0, 12)}…` },
                  { label: 'Subdomain',  value: `${tenant?.slug}.app.com` },
                  { label: 'Plan',       value: tenant?.plan },
                  { label: 'Status',     value: 'Active' },
                  { label: 'DB',         value: 'MongoDB' },
                  { label: 'Auth',       value: 'JWT + Rotation' },
                ].map(({ label, value }) => (
                  <div key={label} className={styles.detailRow}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="card">
              <div className={styles.cardHead}>
                <h3>Security Status</h3>
                <Activity size={16} color="var(--success)" />
              </div>
              <div className={styles.secList}>
                {[
                  { label: 'MongoDB RBAC',       ok: true },
                  { label: 'JWT Access Tokens',  ok: true },
                  { label: 'Token Rotation',     ok: true },
                  { label: 'bcrypt (12 rounds)', ok: true },
                  { label: 'Rate Limiting',      ok: true },
                  { label: 'Helmet.js Headers',  ok: true },
                  { label: 'CORS Policy',        ok: true },
                  { label: 'HTTPS',              ok: false },
                ].map(({ label, ok }) => (
                  <div key={label} className={styles.secRow}>
                    <span>{label}</span>
                    <span className={`badge ${ok ? 'badge-green' : 'badge-yellow'}`}>
                      {ok ? 'Enabled' : 'Dev only'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div className={styles.cardHead}><h3>Quick Actions</h3></div>
              <div className={styles.actionList}>
                {[
                  { to: '/dashboard/users',    label: 'View team members',     icon: Users },
                  { to: '/dashboard/settings', label: 'Workspace settings',    icon: Building2 },
                ].map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className={styles.actionItem}>
                    <div className={styles.actionIcon}>
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                    <span>{label}</span>
                    <ArrowRight size={14} className={styles.actionArrow} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
