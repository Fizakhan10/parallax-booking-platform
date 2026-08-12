/**
 * roomManager.js
 * ──────────────
 * Manages per-booking Yjs document instances.
 * Each booking gets exactly one shared Y.Doc for the lifetime of the process.
 * Documents are persisted to MongoDB every PERSIST_INTERVAL ms and immediately
 * when the last client leaves a room.
 */

import * as Y from "yjs";
import Booking from "../models/booking.model.js";

const PERSIST_INTERVAL_MS = 30_000;

/** @type {Map<string, object>} bookingId → Room */
const rooms = new Map();

const docToPlainText = (doc) => {
  try { return doc.getText("content").toString(); } catch { return ""; }
};

const persistRoom = async (room) => {
  try {
    await Booking.findOneAndUpdate(
      { _id: room.bookingId, tenantId: room.tenantId },
      { $set: { notes: docToPlainText(room.doc) } },
      { new: false }
    );
  } catch (err) {
    console.error(`[roomManager] persist failed for ${room.bookingId}:`, err.message);
  }
};

export const getOrCreateRoom = async (bookingId, tenantId) => {
  if (rooms.has(bookingId)) return rooms.get(bookingId);

  const doc = new Y.Doc();

  try {
    const booking = await Booking.findOne({ _id: bookingId, tenantId }).lean();
    if (booking?.notes) doc.getText("content").insert(0, booking.notes);
  } catch (err) {
    console.error(`[roomManager] seed failed for ${bookingId}:`, err.message);
  }

  const room = {
    doc,
    clients: new Set(),
    bookingId,
    tenantId,
    _wsClients: new Map(),
    persistTimer: setInterval(() => persistRoom(room), PERSIST_INTERVAL_MS),
  };

  rooms.set(bookingId, room);
  return room;
};

export const addClient = (bookingId, clientId) => {
  rooms.get(bookingId)?.clients.add(clientId);
};

export const removeClient = async (bookingId, clientId) => {
  const room = rooms.get(bookingId);
  if (!room) return;
  room.clients.delete(clientId);
  if (room.clients.size === 0) {
    await persistRoom(room);
    clearInterval(room.persistTimer);
    room.doc.destroy();
    rooms.delete(bookingId);
  }
};

export const getRoom     = (bookingId) => rooms.get(bookingId) ?? null;
export const clientCount = (bookingId) => rooms.get(bookingId)?.clients.size ?? 0;

export const _clearAllRooms = () => {
  for (const [, room] of rooms) {
    clearInterval(room.persistTimer);
    room.doc.destroy();
  }
  rooms.clear();
};
