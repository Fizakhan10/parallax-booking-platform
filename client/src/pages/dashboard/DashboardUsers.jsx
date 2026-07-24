import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dashboardAPI } from '../../services/api'
import { Search, Users, ShieldAlert } from 'lucide-react'
import styles from './DashboardUsers.module.css'

const ROLE_BADGE = {
  owner: 'badge-purple',
  admin: 'badge-blue',
  member: 'badge-gray',
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function DashboardUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const canView = me?.role === 'owner' || me?.role === 'admin'

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    dashboardAPI.users()
      .then(({ data }) => setUsers(data.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [canView])

  const filtered = users.filter(
    (u) =>
      (u.full_name || u.fullName)?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Team</h1>
          <p className={styles.pageSubtitle}>Manage members in your workspace</p>
        </div>
        <span className="badge badge-gray">
          <Users size={12} />
          {users.length} member{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!canView && (
        <div className="alert alert-warning">
          <ShieldAlert size={15} />
          Admin or owner role required to view all team members.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {canView && (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className="input-icon-wrap" style={{ maxWidth: 300 }}>
              <span className="input-icon"><Search size={15} /></span>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <div className="spinner spinner-lg" />
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
                        No members found
                      </td>
                    </tr>
                  ) : filtered.map((u) => {
                    const name = u.full_name || u.fullName || '—'
                    const isMe = u.id === me?.id
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.memberCell}>
                            <div className={styles.memberAvatar}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.memberName}>
                                {name}
                                {isMe && <span className={styles.meBadge}>you</span>}
                              </div>
                              <div className={styles.memberEmail}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active !== false ? 'badge-green' : 'badge-red'}`}>
                            {u.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className={styles.metaCell}>{formatDate(u.last_login_at || u.lastLoginAt)}</td>
                        <td className={styles.metaCell}>{formatDate(u.created_at || u.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
