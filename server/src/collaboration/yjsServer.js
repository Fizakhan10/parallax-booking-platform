/**
 * yjsServer.js
 * ────────────
 * Attaches a Yjs / WebSocket collaboration server to an existing http.Server.
 * Upgrade path: ws://host/collaboration/<bookingId>?token=<JWT>
 *
 * Auth: JWT verified → tenant ownership of booking confirmed → client admitted.
 * Protocol: y-protocols sync + awareness, plus a custom presence JSON broadcast.
 */

import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol     from "y-protocols/sync.js";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as encoding  from "lib0/encoding.js";
import * as decoding  from "lib0/decoding.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import env     from "../config/env.js";
import Booking from "../models/booking.model.js";
import { getOrCreateRoom, addClient, removeClient } from "./roomManager.js";
import { userJoined, userLeft, updateCursor, getPresence, colorForUser } from "./presenceManager.js";

const MSG_SYNC       = 0;
const MSG_AWARENESS  = 1;
const MSG_AUTH_ERROR = 2;
const MSG_PRESENCE   = 3;

const send = (ws, msg) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(msg, { binary: true });
};

const broadcastBinary = (wsClients, senderId, msg) => {
  for (const [id, ws] of wsClients) {
    if (id !== senderId) send(ws, msg);
  }
};

const broadcastPresence = (wsClients, payload) => {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_PRESENCE);
  encoding.writeVarString(enc, JSON.stringify(payload));
  const msg = encoding.toUint8Array(enc);
  for (const ws of wsClients.values()) send(ws, msg);
};

const verifyToken = (token) => {
  try { return jwt.verify(token, env.JWT_SECRET); } catch { return null; }
};

const rejectClient = (ws, reason) => {
  try {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AUTH_ERROR);
    encoding.writeVarString(enc, reason);
    ws.send(encoding.toUint8Array(enc), { binary: true });
  } finally {
    ws.close(1008, reason);
  }
};

export const attachCollaborationServer = (httpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    const url   = new URL(req.url, `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/collaboration\/([a-f0-9]{24})$/i);
    if (!match) return;

    const bookingId = match[1];
    const token     = url.searchParams.get("token");

    if (!token) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }

    const decoded = verifyToken(token);
    if (!decoded) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }

    let booking;
    try {
      booking = await Booking.findOne({ _id: bookingId, tenantId: decoded.tenantId }).lean();
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n"); socket.destroy(); return;
    }
    if (!booking) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, {
        bookingId,
        tenantId:  decoded.tenantId.toString(),
        userId:    decoded.userId,
        userName:  decoded.name  || "Anonymous",
        userEmail: decoded.email || "",
      });
    });
  });

  wss.on("connection", async (ws, _req, ctx) => {
    const { bookingId, tenantId, userId, userName, userEmail } = ctx;
    const clientId = uuidv4();

    let room;
    try { room = await getOrCreateRoom(bookingId, tenantId); }
    catch { rejectClient(ws, "Room initialisation failed"); return; }

    addClient(bookingId, clientId);
    room._wsClients.set(clientId, ws);

    userJoined(bookingId, clientId, { id: userId, name: userName, email: userEmail, color: colorForUser(userId) });

    // Yjs sync step 1
    const enc1 = encoding.createEncoder();
    encoding.writeVarUint(enc1, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc1, room.doc);
    send(ws, encoding.toUint8Array(enc1));

    // Broadcast presence
    broadcastPresence(room._wsClients, { type: "presence-update", bookingId, users: getPresence(bookingId) });

    ws.on("message", (raw) => {
      try {
        const message = new Uint8Array(raw);
        const dec     = decoding.createDecoder(message);
        const msgType = decoding.readVarUint(dec);

        if (msgType === MSG_SYNC) {
          const replyEnc = encoding.createEncoder();
          encoding.writeVarUint(replyEnc, MSG_SYNC);
          const syncType = syncProtocol.readSyncMessage(dec, replyEnc, room.doc, ws);
          if (encoding.length(replyEnc) > 1) send(ws, encoding.toUint8Array(replyEnc));
          if (syncType === syncProtocol.messageYjsUpdate) broadcastBinary(room._wsClients, clientId, message);
        } else if (msgType === MSG_AWARENESS) {
          broadcastBinary(room._wsClients, clientId, message);
          try {
            const update = decoding.readVarUint8Array(dec);
            const aDec   = decoding.createDecoder(update);
            const n      = decoding.readVarUint(aDec);
            for (let i = 0; i < n; i++) {
              decoding.readVarUint(aDec);
              const clock = decoding.readVarUint(aDec);
              const str   = decoding.readVarString(aDec);
              if (clock !== 0) {
                try {
                  const state = JSON.parse(str);
                  if (state?.cursor) updateCursor(bookingId, clientId, state.cursor);
                } catch { /* ignore */ }
              }
            }
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error(`[yjsServer] message error client ${clientId}:`, err.message);
      }
    });

    const cleanup = async () => {
      room._wsClients.delete(clientId);
      userLeft(bookingId, clientId);
      await removeClient(bookingId, clientId);
      if (room._wsClients.size > 0) {
        broadcastPresence(room._wsClients, { type: "presence-update", bookingId, users: getPresence(bookingId) });
      }
    };

    ws.on("close", cleanup);
    ws.on("error", (err) => { console.error(`[yjsServer] ws error ${clientId}:`, err.message); cleanup(); });
  });

  console.log("[yjsServer] Collaboration WS attached at /collaboration/:bookingId");
};
