// server/crdt-server.js
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const Y = require('yjs');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// In-memory fallback document storage (or connect to MongoDB/PostgreSQL)
const bookingNotesDb = new Map();

// WebSockets Connection Routing
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname.startsWith('/collaboration/notes/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.pathname.replace('/collaboration/notes/', '');
  
  // Hand off connection to y-websocket handler
  setupWSConnection(ws, req, { docName });
});

// Fallback REST Endpoints for CRDT Failure / Unsupported WS
app.get('/api/bookings/:bookingId/notes', (req, res) => {
  const { bookingId } = req.params;
  const noteContent = bookingNotesDb.get(bookingId) || { content: '' };
  res.json({ success: true, data: noteContent, isFallback: true });
});

app.post('/api/bookings/:bookingId/notes/fallback', (req, res) => {
  const { bookingId } = req.params;
  const { content, updatedAt } = req.body;

  bookingNotesDb.set(bookingId, { content, updatedAt: updatedAt || new Date() });
  res.json({ success: true, message: 'Notes saved via fallback API', updatedAt });
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 CRDT Collaboration Server running on port ${PORT}`);
  });
}

module.exports = { app, server, bookingNotesDb };