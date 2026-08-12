/**
 * useCollaborationStatus.js
 * ─────────────────────────
 * Monitors a y-websocket WebsocketProvider and implements exponential
 * back-off reconnection logic.
 *
 * @param {import('y-websocket').WebsocketProvider | null} provider
 * @returns {{ status: string, reconnect: () => void }}
 *
 * status values:
 *   'idle'         — hook not yet active
 *   'connecting'   — initial connection in progress
 *   'connected'    — live and synced
 *   'reconnecting' — lost connection, retrying
 *   'failed'       — retries exhausted; fallback mode should activate
 *   'unsupported'  — WebSocket API not available in this browser
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const MAX_RETRIES   = 3
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS  = 8_000

const useCollaborationStatus = (provider) => {
  const [status, setStatus] = useState(
    typeof WebSocket === 'undefined' ? 'unsupported' : 'idle'
  )

  const retriesRef   = useRef(0)
  const timerRef     = useRef(null)
  const mountedRef   = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (!provider) return
    retriesRef.current = 0
    clearTimeout(timerRef.current)
    setStatus('connecting')
    provider.connect()
  }, [provider])

  useEffect(() => {
    if (!provider) return
    if (typeof WebSocket === 'undefined') { setStatus('unsupported'); return }

    setStatus('connecting')

    const onStatus = ({ status: s }) => {
      if (!mountedRef.current) return
      if (s === 'connected') { retriesRef.current = 0; clearTimeout(timerRef.current); setStatus('connected') }
    }

    const onDisconnect = () => {
      if (!mountedRef.current) return
      if (retriesRef.current >= MAX_RETRIES) { setStatus('failed'); return }

      setStatus('reconnecting')
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retriesRef.current), MAX_DELAY_MS)
      retriesRef.current += 1

      timerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        if (retriesRef.current > MAX_RETRIES) { setStatus('failed'); return }
        try { provider.connect() } catch { setStatus('failed') }
      }, delay)
    }

    provider.on('status',           onStatus)
    provider.on('connection-close', onDisconnect)
    provider.on('connection-error', onDisconnect)

    if (provider.wsconnected) setStatus('connected')

    return () => {
      clearTimeout(timerRef.current)
      provider.off('status',           onStatus)
      provider.off('connection-close', onDisconnect)
      provider.off('connection-error', onDisconnect)
    }
  }, [provider])

  return { status, reconnect }
}

export default useCollaborationStatus
