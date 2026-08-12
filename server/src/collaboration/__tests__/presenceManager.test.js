import {
  userJoined, userLeft, updateCursor, getPresence,
  getClientPresence, connectedCount, colorForUser, _clearAll,
} from '../presenceManager.js'

const BID = 'booking-abc'
const C1  = 'client-1'
const C2  = 'client-2'
const U1  = { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' }
const U2  = { id: 'user-2', name: 'Bob Jones',   email: 'bob@example.com' }

beforeEach(() => _clearAll())

describe('colorForUser', () => {
  test('returns a hex colour', () => expect(colorForUser('u1')).toMatch(/^#[0-9a-f]{6}$/i))
  test('is deterministic', () => expect(colorForUser('u-abc')).toBe(colorForUser('u-abc')))
  test('varies across different ids', () => {
    const colours = new Set(Array.from({ length: 20 }, (_, i) => colorForUser(`u${i}`)))
    expect(colours.size).toBeGreaterThan(1)
  })
})

describe('userJoined', () => {
  test('adds presence entry', () => { userJoined(BID, C1, U1); expect(connectedCount(BID)).toBe(1) })
  test('stores user metadata', () => {
    userJoined(BID, C1, U1)
    const e = getClientPresence(BID, C1)
    expect(e.user.name).toBe(U1.name)
    expect(e.user.id).toBe(U1.id)
  })
  test('assigns deterministic colour', () => {
    userJoined(BID, C1, U1)
    expect(getClientPresence(BID, C1).user.color).toBe(colorForUser(U1.id))
  })
  test('initialises cursor to null', () => {
    userJoined(BID, C1, U1)
    const { cursor } = getClientPresence(BID, C1)
    expect(cursor.anchor).toBeNull(); expect(cursor.focus).toBeNull()
  })
  test('supports multiple clients', () => {
    userJoined(BID, C1, U1); userJoined(BID, C2, U2)
    expect(connectedCount(BID)).toBe(2)
  })
})

describe('userLeft', () => {
  test('removes entry', () => {
    userJoined(BID, C1, U1); userLeft(BID, C1)
    expect(connectedCount(BID)).toBe(0)
    expect(getClientPresence(BID, C1)).toBeNull()
  })
  test('cleans up room when empty', () => {
    userJoined(BID, C1, U1); userLeft(BID, C1)
    expect(connectedCount(BID)).toBe(0)
  })
  test('no-op for unknown room', () => expect(() => userLeft('nope', C1)).not.toThrow())
  test('no-op for unknown client', () => {
    userJoined(BID, C1, U1)
    expect(() => userLeft(BID, 'ghost')).not.toThrow()
    expect(connectedCount(BID)).toBe(1)
  })
})

describe('updateCursor', () => {
  test('stores cursor position', () => {
    userJoined(BID, C1, U1); updateCursor(BID, C1, { anchor: 5, focus: 10 })
    expect(getClientPresence(BID, C1).cursor).toEqual({ anchor: 5, focus: 10 })
  })
  test('no-op for unknown booking', () => expect(() => updateCursor('nope', C1, { anchor: 0, focus: 0 })).not.toThrow())
})

describe('getPresence', () => {
  test('returns all entries', () => {
    userJoined(BID, C1, U1); userJoined(BID, C2, U2)
    expect(getPresence(BID)).toHaveLength(2)
  })
  test('excludes specified clientId', () => {
    userJoined(BID, C1, U1); userJoined(BID, C2, U2)
    const others = getPresence(BID, C1)
    expect(others).toHaveLength(1); expect(others[0].user.id).toBe(U2.id)
  })
  test('returns [] for non-existent room', () => expect(getPresence('nope')).toEqual([]))
})
