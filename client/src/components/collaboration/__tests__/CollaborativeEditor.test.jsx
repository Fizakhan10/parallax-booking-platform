import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('yjs', () => ({
  Doc: vi.fn(() => ({ getText: vi.fn(() => ({ insert: vi.fn(), toString: vi.fn(() => '') })), transact: vi.fn(f => f()), destroy: vi.fn() })),
}))

const mockProvider = {
  awareness: { setLocalState: vi.fn(), getStates: vi.fn(() => new Map()), on: vi.fn(), off: vi.fn() },
  on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn(), wsconnected: false,
}
vi.mock('y-websocket', () => ({ WebsocketProvider: vi.fn(() => mockProvider) }))

vi.mock('../../../hooks/useCollaborationStatus', () => ({
  default: vi.fn(() => ({ status: 'connected', reconnect: vi.fn() })),
}))

vi.mock('@lexical/react/LexicalComposer',        () => ({ LexicalComposer: ({ children }) => <div data-testid="lexical-composer">{children}</div> }))
vi.mock('@lexical/react/LexicalRichTextPlugin',  () => ({ RichTextPlugin: ({ contentEditable, placeholder }) => <div>{contentEditable}{placeholder}</div> }))
vi.mock('@lexical/react/LexicalContentEditable', () => ({ ContentEditable: (p) => <div contentEditable {...p} data-testid="editor-content" /> }))
vi.mock('@lexical/react/LexicalErrorBoundary',   () => ({ default: ({ children }) => children }))
vi.mock('@lexical/react/LexicalHistoryPlugin',   () => ({ HistoryPlugin: () => null }))
vi.mock('@lexical/react/LexicalOnChangePlugin',  () => ({ OnChangePlugin: () => null }))
vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(() => [{
    registerUpdateListener: vi.fn(() => () => {}),
    registerCommand:        vi.fn(() => () => {}),
    dispatchCommand:        vi.fn(),
    update:                 vi.fn(),
  }]),
}))
vi.mock('@lexical/list',      () => ({ ListPlugin: () => null, ListNode: class {}, ListItemNode: class {} }))
vi.mock('@lexical/link',      () => ({ LinkPlugin: () => null, LinkNode: class {}, AutoLinkNode: class {} }))
vi.mock('@lexical/rich-text', () => ({ HeadingNode: class {}, QuoteNode: class {} }))
vi.mock('../EditorToolbar',   () => ({ default: () => <div data-testid="editor-toolbar" /> }))
vi.mock('../PresenceOverlay', () => ({ default: () => <div data-testid="presence-overlay" /> }))

import CollaborativeEditor from '../CollaborativeEditor'
import useCollaborationStatus from '../../../hooks/useCollaborationStatus'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('accessToken', 'test-token')
  localStorage.setItem('user', JSON.stringify({ id: 'u1', fullName: 'Test User', email: 'test@test.com' }))
})

describe('CollaborativeEditor — connected', () => {
  test('renders toolbar',          () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument() })
  test('renders presence overlay', () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.getByTestId('presence-overlay')).toBeInTheDocument() })
  test('renders Lexical composer', () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.getByTestId('lexical-composer')).toBeInTheDocument() })
  test('shows Live status label',  () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.getByText('Live')).toBeInTheDocument() })
})

describe('CollaborativeEditor — failed / fallback', () => {
  beforeEach(() => useCollaborationStatus.mockReturnValue({ status: 'failed', reconnect: vi.fn() }))

  test('renders fallback banner',   () => { render(<CollaborativeEditor bookingId="b1" initialContent="old" onSave={vi.fn()} />); expect(screen.getByRole('alert')).toBeInTheDocument() })
  test('shows unavailable message', () => { render(<CollaborativeEditor bookingId="b1" initialContent="old" onSave={vi.fn()} />); expect(screen.getByText(/Live collaboration is unavailable/i)).toBeInTheDocument() })
  test('renders textarea with initial content', () => {
    render(<CollaborativeEditor bookingId="b1" initialContent="old note" onSave={vi.fn()} />)
    expect(screen.getByLabelText(/Booking notes \(offline mode\)/i).value).toBe('old note')
  })
  test('shows Try again button',    () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument() })
  test('no toolbar in fallback',    () => { render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />); expect(screen.queryByTestId('editor-toolbar')).not.toBeInTheDocument() })
})

describe('CollaborativeEditor — unsupported', () => {
  test('renders fallback', () => {
    useCollaborationStatus.mockReturnValue({ status: 'unsupported', reconnect: vi.fn() })
    render(<CollaborativeEditor bookingId="b1" initialContent="" onSave={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
