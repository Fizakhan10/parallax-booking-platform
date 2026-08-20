// tests/crdt.test.js
const Y = require('yjs');
const request = require('supertest');
const { app, bookingNotesDb } = require('../server/crdt-server');

describe('Week 4: CRDT & Collaboration Server Test Suite', () => {
  
  describe('CRDT Conflict Resolution (Yjs Mechanics)', () => {
    test('Should resolve concurrent edits deterministically without data loss', () => {
      // Create Doc 1 and Doc 2 simulating two concurrent users
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      const text1 = doc1.getText('booking-notes');
      const text2 = doc2.getText('booking-notes');

      // Initial state sync
      const updateInit = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, updateInit);

      // User 1 inserts at index 0
      text1.insert(0, 'Client requested late check-in. ');

      // User 2 concurrently inserts at index 0
      text2.insert(0, 'VIP Guest. ');

      // Cross-sync update packages
      const updateFrom1 = Y.encodeStateAsUpdate(doc1);
      const updateFrom2 = Y.encodeStateAsUpdate(doc2);

      // Apply updates mutually
      Y.applyUpdate(doc2, updateFrom1);
      Y.applyUpdate(doc1, updateFrom2);

      // Expect both documents to converge to the exact same text structure
      expect(text1.toString()).toEqual(text2.toString());
      expect(text1.toString()).toContain('VIP Guest. ');
      expect(text1.toString()).toContain('Client requested late check-in. ');
    });

    test('Should correctly process concurrent deletions and insertions', () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const text1 = doc1.getText('notes');
      const text2 = doc2.getText('notes');

      text1.insert(0, 'Hello World');
      Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

      // User 1 deletes 'World'
      text1.delete(6, 5);

      // User 2 appends '!' at the end
      text2.insert(11, '!');

      // Sync
      Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));
      Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

      expect(text1.toString()).toEqual('Hello !');
      expect(text2.toString()).toEqual('Hello !');
    });
  });

  describe('Fallback REST Endpoints & Disconnection Handling', () => {
    test('GET /api/bookings/:bookingId/notes - Should fetch empty note fallback default', async () => {
      const response = await request(app).get('/api/bookings/booking-101/notes');
      expect(response.statusCode).toBe(200);
      expect(response.body.isFallback).toBe(true);
      expect(response.body.data.content).toBe('');
    });

    test('POST /api/bookings/:bookingId/notes/fallback - Should persist notes via REST fallback', async () => {
      const payload = { content: 'Offline backup note', updatedAt: new Date().toISOString() };
      
      const response = await request(app)
        .post('/api/bookings/booking-101/notes/fallback')
        .send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify DB updated
      const stored = bookingNotesDb.get('booking-101');
      expect(stored.content).toBe('Offline backup note');
    });
  });
});