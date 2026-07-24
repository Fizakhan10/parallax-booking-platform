import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Layers, LayoutDashboard, Users, Settings,
  LogOut, ChevronDown, Menu, X, Bell
} from 'lucide-react'
import styles from './DashboardLayout.module.css'

const navItems = [
  { to: '/dashboard',          label: 'Overview',  icon: LayoutDashboard, end: true },
  { to: '/dashboard/users',    label: 'Team',       icon: Users },
  { to: '/dashboard/settings', label: 'Settings',  icon: Settings },
]

export default function DashboardLayout() {
  const { user, tenant, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.sidebarHeader}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoMark}>
              <Layers size={16} strokeWidth={2.5} />
            </div>
            <span>TenantHub</span>
          </Link>
          <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Workspace badge */}
        <div className={styles.workspaceBadge}>
          <div className={styles.workspaceAvatar}>
            {tenant?.name?.charAt(0).toUpperCase()}
          </div>
          <div className={styles.workspaceInfo}>
            <div className={styles.workspaceName}>{tenant?.name}</div>
            <div className={styles.workspaceSlug}>{tenant?.slug}.app.com</div>
          </div>
          <span className={`badge badge-purple ${styles.planBadge}`}>{tenant?.plan}</span>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          <div className={styles.navLabel}>Main</div>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.fullName}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className={styles.topbarRight}>
            <button className={styles.topbarIcon} aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className={styles.topbarUser}>
              <div className={styles.topbarAvatar}>{initials}</div>
              <span className={styles.topbarName}>{user?.fullName?.split(' ')[0]}</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
