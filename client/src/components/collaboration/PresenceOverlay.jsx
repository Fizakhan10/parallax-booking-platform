/**
 * PresenceOverlay.jsx
 * ───────────────────
 * Renders an avatar strip and remote cursor carets for collaboration presence.
 *
 * Named exports: AvatarStrip, CursorOverlay
 * Default export: PresenceOverlay (combines both)
 */

import styles from './CollaborativeEditor.module.css'

const MAX_VISIBLE = 5

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Avatar chip ───────────────────────────────────────────────────────────────

function AvatarChip({ user }) {
  const u     = user.user ?? user
  const color = u.color || '#6366f1'
  const name  = u.name  || '?'
  return (
    <div
      className={styles.avatarChip}
      style={{ backgroundColor: color }}
      title={`${name}${u.email ? ` (${u.email})` : ''}`}
      aria-label={`${name} is editing`}
    >
      {u.avatarUrl
        ? <img src={u.avatarUrl} alt={name} className={styles.avatarImg} />
        : <span className={styles.avatarInitials}>{initials(name)}</span>
      }
    </div>
  )
}

// ── Avatar strip ──────────────────────────────────────────────────────────────

export function AvatarStrip({ users = [], currentUserId }) {
  const remote  = users.filter(u => (u.user?.id ?? u.id) !== currentUserId)
  const visible = remote.slice(0, MAX_VISIBLE)
  const overflow = remote.length - visible.length

  if (remote.length === 0) return null

  return (
    <div
      className={styles.avatarStrip}
      role="region"
      aria-label={`${remote.length} other user${remote.length !== 1 ? 's' : ''} editing`}
      aria-live="polite"
    >
      {visible.map((u, i) => <AvatarChip key={u.user?.id ?? u.id ?? i} user={u} />)}
      {overflow > 0 && (
        <div
          className={styles.avatarOverflow}
          title={`${overflow} more user${overflow !== 1 ? 's' : ''}`}
          aria-label={`${overflow} more user${overflow !== 1 ? 's' : ''}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

// ── Remote cursor ─────────────────────────────────────────────────────────────

function RemoteCursor({ user, top, left }) {
  const u     = user.user ?? user
  const color = u.color || '#6366f1'
  const name  = u.name  || 'User'
  return (
    <div
      className={styles.remoteCursor}
      style={{ top, left, '--cursor-color': color }}
      aria-hidden="true"
    >
      <div className={styles.cursorCaret} />
      <div className={styles.cursorLabel}>{name}</div>
    </div>
  )
}

export function CursorOverlay({ cursors = [] }) {
  if (cursors.length === 0) return null
  return cursors.map((c, i) => (
    <RemoteCursor key={c.user?.id ?? i} user={c} top={c.top ?? 0} left={c.left ?? 0} />
  ))
}

// ── Default export (combined) ─────────────────────────────────────────────────

export default function PresenceOverlay({ users = [], cursors = [], currentUserId }) {
  if (users.length === 0 && cursors.length === 0) return null
  return (
    <>
      <AvatarStrip users={users} currentUserId={currentUserId} />
      <CursorOverlay cursors={cursors} />
    </>
  )
}
