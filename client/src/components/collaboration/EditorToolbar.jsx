/**
 * EditorToolbar.jsx
 * Rich-text formatting toolbar wired to a Lexical editor instance.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection, $isRangeSelection,
  FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND,
  CAN_UNDO_COMMAND, CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL,
} from 'lexical'
import {
  INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND, $isListNode,
} from '@lexical/list'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import styles from './CollaborativeEditor.module.css'

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const BoldIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
const ItalicIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
const UnderlineIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
const StrikeIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H4"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
const ULIcon        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
const OLIcon        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4" strokeLinecap="round"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
const LinkIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const UndoIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M3 13C5.33 7.67 10 4 16 4a9 9 0 0 1 0 18H4"/></svg>
const RedoIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M21 13C18.67 7.67 14 4 8 4a9 9 0 0 0 0 18h12"/></svg>

export default function EditorToolbar({ disabled = false }) {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState({
    isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false,
    isLink: false, listType: null, canUndo: false, canRedo: false,
  })

  const updateToolbar = useCallback(() => {
    const sel = $getSelection()
    if (!$isRangeSelection(sel)) return
    const elem = sel.anchor.getNode().getTopLevelElementOrThrow?.() ?? sel.anchor.getNode()
    let listType = null
    if ($isListNode(elem)) listType = elem.getListType()
    else if ($isListNode(elem.getParent?.())) listType = elem.getParent().getListType()
    const node   = sel.anchor.getNode()
    const parent = node.getParent?.()
    setState(s => ({
      ...s,
      isBold:          sel.hasFormat('bold'),
      isItalic:        sel.hasFormat('italic'),
      isUnderline:     sel.hasFormat('underline'),
      isStrikethrough: sel.hasFormat('strikethrough'),
      isLink:          $isLinkNode(parent) || $isLinkNode(node),
      listType,
    }))
  }, [])

  useEffect(() => editor.registerUpdateListener(({ editorState }) => editorState.read(updateToolbar)), [editor, updateToolbar])

  useEffect(() => {
    const u = editor.registerCommand(CAN_UNDO_COMMAND, (v) => { setState(s => ({ ...s, canUndo: v })); return false }, COMMAND_PRIORITY_CRITICAL)
    const r = editor.registerCommand(CAN_REDO_COMMAND, (v) => { setState(s => ({ ...s, canRedo: v })); return false }, COMMAND_PRIORITY_CRITICAL)
    return () => { u(); r() }
  }, [editor])

  const toggleList = (type) => {
    if (state.listType === type) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    else if (type === 'bullet') editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }

  const insertLink = () => {
    if (state.isLink) { editor.dispatchCommand(TOGGLE_LINK_COMMAND, null); return }
    const url = window.prompt('Enter URL:', 'https://')
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  }

  const btn = (onClick, active, title, icon, extraDisabled = false) => (
    <button key={title} type="button" aria-label={title} title={title} onClick={onClick}
      disabled={disabled || extraDisabled}
      className={`${styles.toolbarBtn} ${active ? styles.toolbarBtnActive : ''}`}>
      {icon}
    </button>
  )

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
      {btn(() => editor.dispatchCommand(UNDO_COMMAND, undefined), false, 'Undo', <UndoIcon />, !state.canUndo)}
      {btn(() => editor.dispatchCommand(REDO_COMMAND, undefined), false, 'Redo', <RedoIcon />, !state.canRedo)}
      <div className={styles.toolbarDivider} />
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'),          state.isBold,          'Bold',          <BoldIcon />)}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'),        state.isItalic,        'Italic',        <ItalicIcon />)}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'),     state.isUnderline,     'Underline',     <UnderlineIcon />)}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough'), state.isStrikethrough, 'Strikethrough', <StrikeIcon />)}
      <div className={styles.toolbarDivider} />
      {btn(() => toggleList('bullet'), state.listType === 'bullet', 'Bullet list',   <ULIcon />)}
      {btn(() => toggleList('number'), state.listType === 'number', 'Numbered list', <OLIcon />)}
      <div className={styles.toolbarDivider} />
      {btn(insertLink, state.isLink, state.isLink ? 'Remove link' : 'Insert link', <LinkIcon />)}
    </div>
  )
}
