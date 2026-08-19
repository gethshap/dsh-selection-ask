import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { MarkdownText, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  SelectionAskHistoryState,
  SelectionAskInput,
  SelectionAskPhase,
  SelectionAskState,
} from './controller.ts'
import { MAX_QUESTION_CHARACTERS } from './controller.ts'
import { NS } from './locales.ts'
import {
  captureTextSelection,
  OWNED_UI_ATTRIBUTE,
  placeSelectionOverlay,
  selectionRect,
  type CapturedSelection,
} from './selection.ts'
import { installStyles } from './styles.ts'

export interface SelectionAskInjected {
  hooks: {
    selectionQuery: ObservableSnapshot<SelectionAskState>
    selectionAskHistory: ObservableSnapshot<SelectionAskHistoryState>
  }
  ask(input: SelectionAskInput): Promise<void>
  cancel(): Promise<void>
  reset(): Promise<void>
  openHistory(sourceSessionId: SessionId): void
  closeHistory(sourceSessionId: SessionId): void
  selectHistory(sourceSessionId: SessionId, childSessionId: SessionId): void
}

export type SelectionAskAppProps = PropsRuntime<'shell.overlay'>
  & InjectFace<SelectionAskInjected>
  & PropsLocale<typeof NS>

const ACTIVE = new Set<SelectionAskPhase>(['waiting', 'preparing', 'streaming'])

function owned(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${OWNED_UI_ATTRIBUTE}]`) !== null
}

function statusText(phase: SelectionAskPhase, t: SelectionAskAppProps['t']): string {
  if (phase === 'waiting') return t('waiting')
  if (phase === 'preparing') return t('preparing')
  if (phase === 'streaming') return t('streaming')
  if (phase === 'complete') return t('complete')
  if (phase === 'cancelled') return t('cancelled')
  if (phase === 'error') return t('error')
  return ''
}

export function SelectionAskApp({
  useSessions,
  useSelectionQuery,
  useSelectionAskHistory,
  ask,
  cancel,
  reset,
  openHistory,
  closeHistory,
  selectHistory,
  t,
}: SelectionAskAppProps) {
  const currentSessionId = useSessions(state => state.current)
  const query = useSelectionQuery(state => state)
  const history = useSelectionAskHistory(state => state)
  const [selection, setSelection] = useState<CapturedSelection | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [copied, setCopied] = useState(false)
  const currentRef = useRef(currentSessionId)
  const panelRef = useRef(panelOpen)
  const previousSession = useRef(currentSessionId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  currentRef.current = currentSessionId
  panelRef.current = panelOpen

  useEffect(() => installStyles(), [])
  useEffect(() => {
    if (previousSession.current === currentSessionId) return
    previousSession.current = currentSessionId
    panelRef.current = false
    setPanelOpen(false)
    setSelection(null)
    setQuestion('')
    void reset()
  }, [currentSessionId, reset])
  useEffect(() => { if (panelOpen) textareaRef.current?.focus() }, [panelOpen])
  useEffect(() => { setCopied(false) }, [query.answer])

  useEffect(() => {
    const capture = (target: EventTarget | null): void => {
      if (owned(target) || panelRef.current) return
      setSelection(captureTextSelection(window.getSelection(), currentRef.current))
    }
    const pointer = (event: PointerEvent): void => { capture(event.target) }
    const keyboard = (event: globalThis.KeyboardEvent): void => { capture(event.target) }
    const refresh = (): void => {
      setSelection(current => {
        if (current === null) return null
        const rect = selectionRect(current.range)
        return rect === null ? (panelRef.current ? current : null) : { ...current, rect }
      })
    }
    document.addEventListener('pointerup', pointer, true)
    document.addEventListener('keyup', keyboard, true)
    window.addEventListener('scroll', refresh, true)
    window.addEventListener('resize', refresh)
    return () => {
      document.removeEventListener('pointerup', pointer, true)
      document.removeEventListener('keyup', keyboard, true)
      window.removeEventListener('scroll', refresh, true)
      window.removeEventListener('resize', refresh)
    }
  }, [])

  const items = useMemo(() => currentSessionId === undefined ? [] : history.items
    .filter(item => item.sourceSessionId === currentSessionId)
    .sort((left, right) => right.updatedAt - left.updatedAt), [currentSessionId, history.items])
  const selectedId = currentSessionId === undefined ? undefined : history.selectedBySource[currentSessionId]
  const selected = items.find(item => item.childSessionId === selectedId) ?? items[0]
  const sidebarOpen = currentSessionId !== undefined && history.openBySource[currentSessionId] === true && selected !== undefined

  useEffect(() => {
    if (!sidebarOpen || currentSessionId === undefined || selected === undefined) return
    if (selectedId !== selected.childSessionId) selectHistory(currentSessionId, selected.childSessionId)
  }, [currentSessionId, selected, selectedId, selectHistory, sidebarOpen])

  const position = useMemo(() => selection === null ? null : placeSelectionOverlay(
    selection.rect,
    { width: window.innerWidth, height: window.innerHeight },
    panelOpen ? 440 : 150,
  ), [panelOpen, selection])

  const active = ACTIVE.has(query.phase)
  const canSend = selection !== null && question.trim() !== '' && !active
  const closePanel = (): void => {
    panelRef.current = false
    setPanelOpen(false)
    setSelection(null)
    setQuestion('')
    void reset()
  }
  const submit = (): void => {
    if (!canSend || selection === null) return
    void ask({ sourceSessionId: selection.sourceSessionId, selection: selection.text, question: question.trim() })
  }
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') closePanel()
    else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit() }
  }
  const style: CSSProperties | undefined = position === null ? undefined : {
    left: position.left,
    top: position.top,
    transform: position.above ? 'translate(-50%,-100%)' : 'translateX(-50%)',
  }

  return (
    <div className="gsa-root" {...{ [OWNED_UI_ATTRIBUTE]: '' }}>
      {currentSessionId !== undefined && items.length > 0 && !sidebarOpen && (
        <button className="gsa-launch" type="button" aria-label={t('historyAria', { count: items.length })}
          onClick={() => { openHistory(currentSessionId) }}>
          <span>✦</span><span>{t('history')}</span><span className="gsa-count">{items.length}</span>
        </button>
      )}

      {selection !== null && position !== null && !panelOpen && (
        <button className="gsa-bubble" style={style} type="button"
          onPointerDown={event => { event.preventDefault() }} onClick={() => { panelRef.current = true; setPanelOpen(true) }}>
          ✦ {t('ask')}
        </button>
      )}

      {selection !== null && position !== null && panelOpen && (
        <section className="gsa-panel" style={style} role="dialog" aria-label={t('title')}>
          <header className="gsa-header">
            <span className="gsa-title">✦ {t('title')}</span>
            <button className="gsa-icon" type="button" aria-label={t('close')} onClick={closePanel}>×</button>
          </header>
          <div className="gsa-body">
            <span className="gsa-label">{t('quote')}</span>
            <blockquote className="gsa-quote">{selection.text}</blockquote>
            <label className="gsa-label" htmlFor="gsa-question">{t('question')}</label>
            <div className="gsa-quick">
              <button type="button" onClick={() => { setQuestion(t('promptExplain')) }}>{t('explain')}</button>
              <button type="button" onClick={() => { setQuestion(t('promptSummarize')) }}>{t('summarize')}</button>
              <button type="button" onClick={() => { setQuestion(t('promptTranslate')) }}>{t('translate')}</button>
            </div>
            <textarea id="gsa-question" ref={textareaRef} className="gsa-question" value={question}
              maxLength={MAX_QUESTION_CHARACTERS} disabled={active} placeholder={t('placeholder')}
              onChange={event => { setQuestion(event.target.value) }} onKeyDown={keyDown} />
            {query.reasoning !== '' && <details className="gsa-reasoning"><summary>{t('reasoning')}</summary><MarkdownText text={query.reasoning} streaming={query.phase === 'streaming'} /></details>}
            {query.answer !== '' && <div className="gsa-answer"><MarkdownText text={query.answer} streaming={query.phase === 'streaming'} /></div>}
            {query.phase === 'complete' && query.answer === '' && <div>{t('empty')}</div>}
            {query.error !== null && <div className="gsa-error" role="alert">{query.error}</div>}
          </div>
          <footer className="gsa-footer">
            <span className="gsa-status"><span>{statusText(query.phase, t)}</span>{query.modelLabel !== null && <span>{t('model', { model: query.modelLabel })}</span>}</span>
            <span>
              {query.answer !== '' && <button className="gsa-secondary" type="button" onClick={() => { void writeClipboard(query.answer).then(setCopied) }}>{copied ? t('copied') : t('copy')}</button>}
              {active
                ? <button className="gsa-primary" type="button" onClick={() => { void cancel() }}>{t('stop')}</button>
                : <button className="gsa-primary" type="button" disabled={!canSend} onClick={submit}>{t('send')}</button>}
            </span>
          </footer>
        </section>
      )}

      {sidebarOpen && currentSessionId !== undefined && selected !== undefined && (
        <aside className="gsa-sidebar" aria-label={t('history')}>
          <header className="gsa-header"><span className="gsa-title">✦ {t('historyList')}</span><button className="gsa-icon" type="button" aria-label={t('close')} onClick={() => { closeHistory(currentSessionId) }}>×</button></header>
          <nav className="gsa-history">
            {items.map(item => <button type="button" key={item.childSessionId} data-selected={item.childSessionId === selected.childSessionId || undefined} onClick={() => { selectHistory(currentSessionId, item.childSessionId) }}><span>{item.question}</span><small>{statusText(item.phase, t)}</small></button>)}
          </nav>
          <div className="gsa-body">
            {selected.selection !== '' && <><span className="gsa-label">{t('quote')}</span><blockquote className="gsa-quote">{selected.selection}</blockquote></>}
            <span className="gsa-label">{t('question')}</span><div className="gsa-sidebar-question">{selected.question}</div>
            {!selected.loaded && <div>{t('loading')}</div>}
            {selected.reasoning !== '' && <details className="gsa-reasoning"><summary>{t('reasoning')}</summary><MarkdownText text={selected.reasoning} streaming={selected.phase === 'streaming'} /></details>}
            {selected.answer !== '' && <div className="gsa-answer"><MarkdownText text={selected.answer} streaming={selected.phase === 'streaming'} /></div>}
            {selected.error !== null && <div className="gsa-error">{selected.error}</div>}
          </div>
          <footer className="gsa-footer"><span className="gsa-status">{selected.modelLabel === null ? t('bound') : t('model', { model: selected.modelLabel })}</span>{selected.answer !== '' && <button className="gsa-secondary" type="button" onClick={() => { void writeClipboard(selected.answer) }}>{t('copy')}</button>}</footer>
        </aside>
      )}
    </div>
  )
}
