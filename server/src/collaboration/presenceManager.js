/**
 * presenceManager.js
 * ──────────────────
 * Tracks connected users and their cursor state per booking room.
 */

/** @type {Map<string, Map<string, object>>} bookingId → clientId → entry */
const presenceMap = new Map();

const PALETTE = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#3b82f6","#ef4444","#14b8a6",
  "#f97316","#84cc16",
];

export const colorForUser = (userId) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

const ensureRoom = (bookingId) => {
  if (!presenceMap.has(bookingId)) presenceMap.set(bookingId, new Map());
  return presenceMap.get(bookingId);
};

export const userJoined = (bookingId, clientId, user) => {
  ensureRoom(bookingId).set(clientId, {
    user: { ...user, color: colorForUser(user.id) },
    cursor: { anchor: null, focus: null },
    connectedAt: Date.now(),
  });
};

export const updateCursor = (bookingId, clientId, cursor) => {
  const entry = presenceMap.get(bookingId)?.get(clientId);
  if (entry) entry.cursor = cursor;
};

export const userLeft = (bookingId, clientId) => {
  const room = presenceMap.get(bookingId);
  if (!room) return;
  room.delete(clientId);
  if (room.size === 0) presenceMap.delete(bookingId);
};

export const getPresence = (bookingId, excludeClientId) => {
  const room = presenceMap.get(bookingId);
  if (!room) return [];
  return [...room.entries()]
    .filter(([id]) => id !== excludeClientId)
    .map(([, entry]) => entry);
};

export const getClientPresence = (bookingId, clientId) =>
  presenceMap.get(bookingId)?.get(clientId) ?? null;

export const connectedCount = (bookingId) =>
  presenceMap.get(bookingId)?.size ?? 0;

export const _clearAll = () => presenceMap.clear();
