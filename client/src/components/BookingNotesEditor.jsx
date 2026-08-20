// src/components/BookingNotesEditor.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Avatar, AvatarGroup, Tooltip, Alert, Spinner } from '@mui/material';

const getRandomColor = () => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#009688', '#ff9800'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const BookingNotesEditor = ({ bookingId, currentUser }) => {
  const [provider, setProvider] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'fallback' | 'connecting'
  const [fallbackText, setFallbackText] = useState('');

  // 1. Initialize Yjs Document
  const ydoc = useMemo(() => new Y.Doc(), [bookingId]);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:4000/collaboration/notes/';
    const wsProvider = new WebsocketProvider(wsUrl, bookingId, ydoc);

    wsProvider.on('status', (event) => {
      if (event.status === 'connected') {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('connecting');
      }
    });

    // Handle WebSocket disconnection timeout to trigger Fallback
    const connectionTimeout = setTimeout(() => {
      if (wsProvider.wsconnected === false) {
        setConnectionStatus('fallback');
        fetchFallbackNotes();
      }
    }, 5000);

    // Track user presence via Awareness API
    const userColor = getRandomColor();
    wsProvider.awareness.setLocalStateField('user', {
      name: currentUser.name,
      color: userColor,
      avatar: currentUser.avatar,
    });

    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().values());
      const users = states.filter((s) => s.user).map((s) => s.user);
      setActiveUsers(users);
    });

    setProvider(wsProvider);

    return () => {
      clearTimeout(connectionTimeout);
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [bookingId, ydoc]);

  // Fallback REST fetch function
  const fetchFallbackNotes = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/notes`);
      const data = await res.json();
      if (data.data?.content) setFallbackText(data.data.content);
    } catch (err) {
      console.error('Fallback fetch error:', err);
    }
  };

  // Fallback manual save function
  const handleFallbackSave = async (e) => {
    const content = e.target.value;
    setFallbackText(content);
    await fetch(`/api/bookings/${bookingId}/notes/fallback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, updatedAt: new Date() }),
    });
  };

  // 2. Configure Tiptap Rich Text Editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }), // CRDT manages history
        ...(provider
          ? [
              Collaboration.configure({ document: ydoc }),
              CollaborationCursor.configure({
                provider: provider,
                user: {
                  name: currentUser.name,
                  color: getRandomColor(),
                },
              }),
            ]
          : []),
      ],
    },
    [provider]
  );

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Top Header: Connection Status & Presence Indicators */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">Booking Notes</h3>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-500'
                : connectionStatus === 'fallback'
                ? 'bg-amber-500'
                : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Live Active Avatars */}
        {connectionStatus === 'connected' && (
          <AvatarGroup max={4}>
            {activeUsers.map((user, idx) => (
              <Tooltip key={idx} title={user.name}>
                <Avatar
                  alt={user.name}
                  src={user.avatar}
                  style={{ backgroundColor: user.color, width: 32, height: 32 }}
                >
                  {user.name.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        )}
      </div>

      {/* Connection State Notices */}
      {connectionStatus === 'connecting' && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Spinner size={16} /> Connecting to real-time session...
        </div>
      )}

      {/* Editor or REST Fallback UI */}
      {connectionStatus === 'fallback' ? (
        <div>
          <Alert severity="warning" className="mb-3">
            Real-time collaboration is currently unavailable. Switched to autosave mode.
          </Alert>
          <textarea
            className="w-full p-3 border rounded-md focus:ring focus:ring-blue-200 min-h-[150px]"
            value={fallbackText}
            onChange={handleFallbackSave}
            placeholder="Type notes here..."
          />
        </div>
      ) : (
        <div className="prose max-w-none min-h-[150px] p-2 border rounded-md">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};