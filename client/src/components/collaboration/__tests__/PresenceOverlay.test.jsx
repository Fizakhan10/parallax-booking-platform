import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import PresenceOverlay, { AvatarStrip, CursorOverlay } from '../PresenceOverlay'

const mk = (id, name, email = '') => ({ user: { id, name, email, color: '#6366f1' }, cursor: { anchor: null, focus: null } })
const ME = 'user-me'
const U3 = [mk('u1','Alice Smith'), mk('u2','Bob Jones'), mk('u3','Carol White')]
const U7 = Array.from({ length: 7 }, (_, i) => mk(`u${i+1}`, `User${i+1}`))

describe('AvatarStrip', () => {
  test('renders nothing when no remote users', () => {
    const { container } = render(<AvatarStrip users={[mk(ME,'Me')]} currentUserId={ME} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders one chip per remote user (≤5)', () => {
    render(<AvatarStrip users={U3} currentUserId={ME} />)
    expect(screen.getByLabelText('Alice Smith is editing')).toBeInTheDocument()
    expect(screen.getByLabelText('Bob Jones is editing')).toBeInTheDocument()
    expect(screen.getByLabelText('Carol White is editing')).toBeInTheDocument()
  })

  test('excludes current user', () => {
    render(<AvatarStrip users={[...U3, mk(ME,'Me')]} currentUserId={ME} />)
    expect(screen.queryByLabelText('Me is editing')).not.toBeInTheDocument()
  })

  test('shows overflow badge when >5 users', () => {
    render(<AvatarStrip users={U7} currentUserId={ME} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByLabelText('2 more users')).toBeInTheDocument()
  })

  test('no overflow badge for exactly 5 users', () => {
    render(<AvatarStrip users={U7.slice(0,5)} currentUserId={ME} />)
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })

  test('has accessible region label', () => {
    render(<AvatarStrip users={U3} currentUserId={ME} />)
    expect(screen.getByRole('region', { name: /3 other users editing/i })).toBeInTheDocument()
  })

  test('renders initials for users without avatarUrl', () => {
    render(<AvatarStrip users={[mk('u1','Alice Smith')]} currentUserId={ME} />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  test('renders img when avatarUrl present', () => {
    const u = { user: { id:'u1', name:'Alice', email:'', color:'#f00', avatarUrl:'https://example.com/a.png' }, cursor:{} }
    render(<AvatarStrip users={[u]} currentUserId={ME} />)
    expect(screen.getByRole('img', { name: 'Alice' })).toBeInTheDocument()
  })
})

describe('CursorOverlay', () => {
  test('renders nothing for empty cursors', () => {
    const { container } = render(<CursorOverlay cursors={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders a caret per cursor', () => {
    const cursors = [
      { user: { id:'u1', name:'Alice', color:'#6366f1' }, top:20, left:40 },
      { user: { id:'u2', name:'Bob',   color:'#f59e0b' }, top:60, left:80 },
    ]
    const { container } = render(<CursorOverlay cursors={cursors} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
  })

  test('displays user name on each cursor', () => {
    render(<CursorOverlay cursors={[{ user:{ id:'u1', name:'Alice', color:'#f00' }, top:0, left:0 }]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

describe('PresenceOverlay (default)', () => {
  test('renders avatar strip and cursor label together', () => {
    render(<PresenceOverlay users={U3} cursors={[{ user:{id:'u1',name:'Alice',color:'#f00'}, top:10, left:20 }]} currentUserId={ME} />)
    expect(screen.getByRole('region')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  test('renders null when both props empty', () => {
    const { container } = render(<PresenceOverlay users={[]} cursors={[]} currentUserId={ME} />)
    expect(container.firstChild).toBeNull()
  })
})
