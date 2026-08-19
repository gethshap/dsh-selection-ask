import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { MAX_SELECTION_CHARACTERS } from './controller.ts'

export const OWNED_UI_ATTRIBUTE = 'data-dsh-selection-ask-ui'

export interface CapturedSelection {
  sourceSessionId: SessionId
  text: string
  truncated: boolean
  rect: DOMRect
  range: Range
}

function elementOf(node: Node | null): Element | null {
  if (node === null) return null
  return node.nodeType === 1 ? node as Element : node.parentElement
}

function excluded(node: Node | null): boolean {
  let element = elementOf(node)
  while (element !== null) {
    if (element.hasAttribute(OWNED_UI_ATTRIBUTE)) return true
    if (element instanceof HTMLElement && element.isContentEditable) return true
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return true
    element = element.parentElement
  }
  return false
}

export function captureTextSelection(
  selection: Selection | null,
  sourceSessionId: SessionId | undefined,
): CapturedSelection | null {
  if (selection === null || sourceSessionId === undefined || selection.isCollapsed || selection.rangeCount === 0) return null
  if (excluded(selection.anchorNode) || excluded(selection.focusNode)) return null
  const text = selection.toString().trim()
  if (text === '') return null
  const range = selection.getRangeAt(0)
  if (excluded(range.commonAncestorContainer)) return null
  const rect = range.getBoundingClientRect()
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top) || (rect.width <= 0 && rect.height <= 0)) return null
  return {
    sourceSessionId,
    text: text.slice(0, MAX_SELECTION_CHARACTERS),
    truncated: text.length > MAX_SELECTION_CHARACTERS,
    rect,
    range: range.cloneRange(),
  }
}

export function selectionRect(range: Range): DOMRect | null {
  try {
    const rect = range.getBoundingClientRect()
    return Number.isFinite(rect.left) && Number.isFinite(rect.top) ? rect : null
  } catch {
    return null
  }
}

export function placeSelectionOverlay(
  rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  viewport: { width: number; height: number },
  width: number,
): { left: number; top: number; above: boolean } {
  const margin = 12
  const gap = 10
  const half = Math.min(width, viewport.width - margin * 2) / 2
  const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max))
  const above = rect.bottom > viewport.height * 0.6
  return {
    left: clamp((rect.left + rect.right) / 2, margin + half, viewport.width - margin - half),
    top: above ? Math.max(margin, rect.top - gap) : Math.min(viewport.height - margin, rect.bottom + gap),
    above,
  }
}
