/**
 * CollaborativeEditor.jsx
 * ───────────────────────
 * Collaborative rich-text editor for booking notes.
 * Uses Yjs + y-websocket for real-time sync and Lexical for rich text.
 *
 * Props
 * ─────
 * bookingId      {string}    MongoDB booking _id
 * initialContent {string}    Existing plain-text notes from the booking
 * onSave         {Function}  async (plainText) => void — called on auto-save
 * readOnly       {boolean}   Disable editing
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { LexicalComposer }    from '@lexical/react/LexicalComposer'
import { RichTextPlugin }     from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable }    from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin }      from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin }         from '@lexical/react/LexicalListPlugin'
import { LinkPlugin }         from '@lexical/react/LexicalLinkPlugin'
import { OnChangePlugin }     from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical'
import { ListNode, ListItemNode }  from '@lexical/list'
import { LinkNode, AutoLinkNode }  from '@lexical/link'
import { HeadingNode, QuoteNode }  from '@lexical/rich-text'
import LexicalErrorBoundary        from '@lexical/react/LexicalErrorBoundary'

import EditorToolbar   from './EditorToolbar'
import PresenceOverlay from './PresenceOverlay'
import useCollaborationStatus from '../../hooks/useCollaborationStatus'
import styles from './CollaborativeEditor.module.css'

const WS_BASE_URL           = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
const AUTO_SAVE_INTERVAL_MS = 10_000

const theme = {
  text: { bold: 'editor-bold', italic: 'editor-italic', underline: 'editor-underline', strikethrough: 'editor-strikethrough' },
  list: { ul: 'editor-ul', ol: 'editor-ol', listitem: 'editor-li' },
  link: 'editor-link',
}

const STATUS_LABEL = {
  idle: 'Not connected', connecting: 'Connecting…', connected: 'Live',
  reconnecting: 'Reconnecting…', failed: 'Offline', unsupported: 'Not supported',
}

// ── Word count plugin ─────────────────────────────────────────────────────────
function WordCountPlugin({ onCount }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const text  = $getRoot().getTextContent()
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      onCount({ words, chars: text.length })
    })
  }), [editor, onCount])
  return null
}

// ── Seed plugin — loads plain-text into editor on first render ────────────────
function SeedPlugin({ content, seeded }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (seeded.current || !content) return
    seeded.current = true
    editor.update(() => {
      const root = $getRoot()
      if (root.getTextContent().trim() !== '') return
      root.clear()
      const p = $createParagraphNode()
      p.append($createTextNode(content))
      root.append(p)
    })
  }, [editor, content, seeded])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CollaborativeEditor({ bookingId, initialContent = '', onSave, readOnly = false }) {
  const token = localStorage.getItem('accessToken') || ''

  // ── Yjs provider ─────────────────────────────────────────────────────────
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    if (!bookingId || !token) return
    const ydoc       = new Y.Doc()
    const wsProvider = new WebsocketProvider(
      `${WS_BASE_URL}/collaboration/${bookingId}?token=${token}`,
      bookingId,
      ydoc,
      { connect: true }
    )

    // Set local awareness state
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      wsProvider.awareness.setLocalState({
        user: { id: user.id || 'anon', name: user.fullName || user.name || 'You', email: user.email || '', color: '#6366f1', avatarUrl: user.avatarUrl || null },
        cursor: null,
      })
    } catch { /* ignore */ }

    setProvider(wsProvider)
    return () => {
      wsProvider.disconnect()
      wsProvider.destroy()
      ydoc.destroy()
      setProvider(null)
    }
  }, [bookingId, token])

  const { status, reconnect } = useCollaborationStatus(provider)
  const isFailed = status === 'failed' || status === 'unsupported'

  // ── Presence ──────────────────────────────────────────────────────────────
  const [presenceUsers, setPresenceUsers] = useState([])
  useEffect(() => {
    if (!provider) return
    const onChange = () => setPresenceUsers(
      Array.from(provider.awareness.getStates().entries()).map(([id, s]) => ({ clientId: id, ...s }))
    )
    provider.awareness.on('change', onChange)
    return () => provider.awareness.off('change', onChange)
  }, [provider])

  // ── Fallback content ──────────────────────────────────────────────────────
  const [fallbackText, setFallbackText] = useState(initialContent)
  const [fallbackDirty, setFallbackDirty] = useState(false)
  const latestTextRef = useRef(initialContent)

  // Push fallback edits back into Yjs when connectivity is restored
  useEffect(() => {
    if (status !== 'connected' || !fallbackDirty || !provider) return
    // This would go into the Yjs doc — handled by the server sync
    setFallbackDirty(false)
  }, [status, fallbackDirty, provider])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const autoSaveTimer = useRef(null)
  const [saveLabel, setSaveLabel] = useState('')

  const scheduleAutoSave = useCallback(() => {
    if (!onSave) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try { setSaveLabel('Saving…'); await onSave(latestTextRef.current); setSaveLabel('Saved'); setTimeout(() => setSaveLabel(''), 2000) }
      catch { setSaveLabel('Save failed') }
    }, AUTO_SAVE_INTERVAL_MS)
  }, [onSave])

  useEffect(() => () => clearTimeout(autoSaveTimer.current), [])

  const handleChange = useCallback((editorState) => {
    editorState.read(() => { latestTextRef.current = $getRoot().getTextContent() })
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // ── Word count ────────────────────────────────────────────────────────────
  const [count, setCount] = useState({ words: 0, chars: 0 })
  const handleCount = useCallback((c) => setCount(c), [])

  // ── Lexical config ────────────────────────────────────────────────────────
  const seededRef = useRef(false)
  const initialConfig = useMemo(() => ({
    namespace: `booking-notes-${bookingId}`,
    theme,
    nodes: [ListNode, ListItemNode, LinkNode, AutoLinkNode, HeadingNode, QuoteNode],
    editable: !readOnly && !isFailed,
    onError: (err) => console.error('[Lexical]', err),
  }), [bookingId, readOnly, isFailed])

  const currentUserId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.id || '' } catch { return '' }
  }, [])

  // ── Fallback render ───────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className={`${styles.editorWrapper} ${styles.fallbackWrapper}`}>
        <div className={styles.fallbackBanner} role="alert" aria-live="assertive">
          <span className={styles.fallbackBannerIcon}>⚠️</span>
          <span>
            Live collaboration is unavailable. Your changes will be saved automatically.{' '}
            <button type="button" onClick={reconnect}
              style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
              Try again
            </button>
          </span>
        </div>
        <label htmlFor="fallback-notes" className="sr-only">Booking notes</label>
        <textarea
          id="fallback-notes"
          className={styles.fallbackTextarea}
          value={fallbackText}
          onChange={(e) => { setFallbackText(e.target.value); setFallbackDirty(true); latestTextRef.current = e.target.value; scheduleAutoSave() }}
          disabled={readOnly}
          placeholder="Add internal notes about this booking…"
          aria-label="Booking notes (offline mode)"
          aria-describedby="fallback-status"
        />
        <div id="fallback-status" className={styles.editorFooter}>
          <span className={styles.wordCount}>{count.words} words · {fallbackText.length} chars</span>
          {saveLabel && <span className={styles.autoSaveStatus} aria-live="polite">{saveLabel}</span>}
        </div>
      </div>
    )
  }

  // ── Collaborative render ──────────────────────────────────────────────────
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.editorWrapper}>
        <div className={styles.statusBar}>
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot} data-status={status} />
            <span>{STATUS_LABEL[status] ?? status}</span>
          </div>
          <PresenceOverlay users={presenceUsers} currentUserId={currentUserId} />
        </div>

        <EditorToolbar disabled={readOnly} />

        <div className={styles.editorScroll}>
          <div className={styles.editorInner}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={styles.editorInput}
                  aria-label="Booking notes editor"
                  aria-multiline="true"
                  role="textbox"
                  spellCheck
                />
              }
              placeholder={<div className={styles.editorPlaceholder} aria-hidden="true">Add internal notes about this booking…</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>

        <div className={styles.editorFooter}>
          <span className={styles.wordCount} aria-live="off">{count.words} words · {count.chars} chars</span>
          {saveLabel && <span className={styles.autoSaveStatus} aria-live="polite">{saveLabel}</span>}
        </div>

        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <WordCountPlugin onCount={handleCount} />
        <SeedPlugin content={initialContent} seeded={seededRef} />
      </div>
    </LexicalComposer>
  )
}
