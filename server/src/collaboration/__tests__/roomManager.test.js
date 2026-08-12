import { jest } from '@jest/globals'

const mockFindOne          = jest.fn()
const mockFindOneAndUpdate = jest.fn()

jest.unstable_mockModule('../../models/booking.model.js', () => ({
  default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate },
}))

const { getOrCreateRoom, addClient, removeClient, getRoom, clientCount, _clearAllRooms } =
  await import('../roomManager.js')

const BOOKING_ID = '507f1f77bcf86cd799439011'
const TENANT_ID  = '507f1f77bcf86cd799439012'

beforeEach(() => {
  jest.clearAllMocks()
  _clearAllRooms()
  mockFindOne.mockResolvedValue({ _id: BOOKING_ID, notes: '' })
  mockFindOneAndUpdate.mockResolvedValue(null)
})
afterEach(() => _clearAllRooms())

describe('getOrCreateRoom', () => {
  test('creates a room with a valid Y.Doc', async () => {
    const room = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(room).toBeDefined()
    expect(typeof room.doc.getText).toBe('function')
  })

  test('returns the same room on subsequent calls', async () => {
    const r1 = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    const r2 = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(r1).toBe(r2)
    expect(mockFindOne).toHaveBeenCalledTimes(1)
  })

  test('seeds Y.Text with existing notes', async () => {
    mockFindOne.mockResolvedValue({ _id: BOOKING_ID, notes: 'existing note' })
    const room = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(room.doc.getText('content').toString()).toBe('existing note')
  })

  test('creates empty doc when notes is blank', async () => {
    const room = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(room.doc.getText('content').toString()).toBe('')
  })

  test('creates room even when DB lookup fails', async () => {
    mockFindOne.mockRejectedValue(new Error('DB down'))
    const room = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(room).toBeDefined()
  })
})

describe('addClient / clientCount', () => {
  test('increments count after addClient', async () => {
    await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    addClient(BOOKING_ID, 'c1'); addClient(BOOKING_ID, 'c2')
    expect(clientCount(BOOKING_ID)).toBe(2)
  })

  test('returns 0 for non-existent room', () => {
    expect(clientCount('nope')).toBe(0)
  })
})

describe('removeClient', () => {
  test('decrements count', async () => {
    await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    addClient(BOOKING_ID, 'c1'); addClient(BOOKING_ID, 'c2')
    await removeClient(BOOKING_ID, 'c1')
    expect(clientCount(BOOKING_ID)).toBe(1)
  })

  test('persists and destroys room when last client leaves', async () => {
    await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    addClient(BOOKING_ID, 'c1')
    await removeClient(BOOKING_ID, 'c1')
    expect(getRoom(BOOKING_ID)).toBeNull()
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1)
  })

  test('does not persist while clients remain', async () => {
    await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    addClient(BOOKING_ID, 'c1'); addClient(BOOKING_ID, 'c2')
    await removeClient(BOOKING_ID, 'c1')
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled()
  })

  test('is a no-op for non-existent room', async () => {
    await expect(removeClient('nope', 'c1')).resolves.not.toThrow()
  })
})

describe('getRoom', () => {
  test('returns null before creation', () => expect(getRoom(BOOKING_ID)).toBeNull())
  test('returns room after creation', async () => {
    const room = await getOrCreateRoom(BOOKING_ID, TENANT_ID)
    expect(getRoom(BOOKING_ID)).toBe(room)
  })
})
