import { jest } from '@jest/globals'
import * as Y from 'yjs'

jest.unstable_mockModule('../../models/booking.model.js', () => ({
  default: {
    findOne:          jest.fn().mockResolvedValue({ _id: 'b1', notes: '' }),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
  },
}))

const { getOrCreateRoom, addClient, removeClient, getRoom, _clearAllRooms } =
  await import('../roomManager.js')
const { userJoined, userLeft, getPresence, connectedCount, _clearAll } =
  await import('../presenceManager.js')

const BID = 'booking-disconnect'
const TID = 'tenant-1'

const join = async (cid, name = 'User') => {
  await getOrCreateRoom(BID, TID)
  addClient(BID, cid)
  userJoined(BID, cid, { id: cid, name, email: '' })
}
const drop = async (cid) => { userLeft(BID, cid); await removeClient(BID, cid) }

beforeEach(() => { _clearAllRooms(); _clearAll() })
afterEach(() => { _clearAllRooms(); _clearAll() })

describe('disconnection edge cases', () => {
  test('doc is not corrupted when client drops mid-edit', async () => {
    await join('cA', 'Alice'); await join('cB', 'Bob')
    const room = getRoom(BID)
    room.doc.getText('content').insert(0, 'Hello from Alice')
    await drop('cB')
    expect(room.doc.getText('content').toString()).toBe('Hello from Alice')
  })

  test('dropped user awareness entry removed immediately', async () => {
    await join('cA', 'Alice'); await join('cB', 'Bob')
    await drop('cB')
    expect(connectedCount(BID)).toBe(1)
    const remaining = getPresence(BID)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].user.name).toBe('Alice')
  })

  test('no zombie entries after all clients disconnect', async () => {
    await join('cA', 'Alice'); await join('cB', 'Bob')
    await drop('cA'); await drop('cB')
    expect(connectedCount(BID)).toBe(0)
    expect(getPresence(BID)).toEqual([])
  })

  test('room destroyed and persisted after last disconnect', async () => {
    const { default: Booking } = await import('../../models/booking.model.js')
    await join('cA', 'Alice')
    getRoom(BID).doc.getText('content').insert(0, 'Final')
    await drop('cA')
    expect(getRoom(BID)).toBeNull()
    expect(Booking.findOneAndUpdate).toHaveBeenCalledTimes(1)
  })

  test('reconnecting client can re-join torn-down room', async () => {
    await join('cA'); await drop('cA')
    const newRoom = await getOrCreateRoom(BID, TID)
    expect(newRoom).toBeDefined()
  })

  test('rapid join-leave-join leaves no dangling state', async () => {
    for (let i = 0; i < 5; i++) { await join('cR', 'Rapid'); await drop('cR') }
    expect(connectedCount(BID)).toBe(0)
    expect(getRoom(BID)).toBeNull()
  })

  test('partial edits by dropped client are preserved', async () => {
    await join('cA', 'Alice'); await join('cB', 'Bob')
    const room = getRoom(BID)
    room.doc.getText('content').insert(0, 'Part A')
    room.doc.getText('content').insert(6, ' Part B')
    await drop('cB')
    const text = room.doc.getText('content').toString()
    expect(text).toContain('Part A')
    expect(text).toContain('Part B')
  })
})
