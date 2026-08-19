import type { IApiClient, ModelSelection, SessionEvent } from '@deepseek-ai/dsh-client-connection/client'
import {
  createSnapshotStore,
  type ConversationSnapshot,
  type ISessions,
  type IWorkspaces,
  type SessionFace,
  type SessionId,
  type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  buildSelectionAskPrompt,
  parseSelectionAskPrompt,
  selectedTextQuestionTitle,
  SELECTION_ASK_TITLE_PREFIX,
} from './prompt.ts'

export { buildSelectionAskPrompt, parseSelectionAskPrompt, selectedTextQuestionTitle } from './prompt.ts'

export const MAX_SELECTION_CHARACTERS = 12_000
export const MAX_QUESTION_CHARACTERS = 2_000

export type SelectionAskPhase =
  | 'idle'
  | 'waiting'
  | 'preparing'
  | 'streaming'
  | 'complete'
  | 'cancelled'
  | 'error'

export interface SelectionAskState {
  phase: SelectionAskPhase
  answer: string
  reasoning: string
  modelLabel: string | null
  error: string | null
}

export interface SelectionAskHistoryItem extends SelectionAskState {
  childSessionId: SessionId
  sourceSessionId: SessionId
  selection: string
  question: string
  updatedAt: number
  loaded: boolean
}

export interface SelectionAskHistoryState {
  items: SelectionAskHistoryItem[]
  selectedBySource: Partial<Record<SessionId, SessionId>>
  openBySource: Partial<Record<SessionId, boolean>>
}

export interface SelectionAskInput {
  sourceSessionId: SessionId
  selection: string
  question: string
}

type SessionApi = Pick<IApiClient['sessions'],
  'history' | 'models' | 'selectModel' | 'rename' | 'prompt' | 'cancel'>

export interface SelectionAskControllerDeps {
  sessions: Pick<ISessions, 'binding' | 'fork' | 'list' | 'open'>
  workspaces: Pick<IWorkspaces, 'archiveSession' | 'list'>
  api: SessionApi
}

interface QueryOperation {
  readonly abort: AbortController
  done: Promise<void>
  childSessionId: SessionId | null
  sourceSessionId: SessionId
}

const INITIAL_STATE: SelectionAskState = {
  phase: 'idle', answer: '', reasoning: '', modelLabel: null, error: null,
}

const INITIAL_HISTORY_STATE: SelectionAskHistoryState = {
  items: [], selectedBySource: {}, openBySource: {},
}

class QueryCancelled extends Error {}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new QueryCancelled('selected-text query cancelled')
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new QueryCancelled('selected-text query cancelled'))
    }, { once: true })
  })
}

export function latestCompletedTurnSeq(snapshot: ConversationSnapshot): number | undefined {
  let latest: number | undefined
  for (const seq of snapshot.turnEnds.values()) {
    if (latest === undefined || seq > latest) latest = seq
  }
  return latest
}

function modelLabel(selection: ModelSelection): string {
  return `${selection.provider}/${selection.model}`
}

type HistoryEvent = SessionEvent

function userText(event: HistoryEvent): string {
  if (event.type !== 'user/message') return ''
  return event.data.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

export interface HistoryProjection {
  selection: string
  question: string
  answer: string
  reasoning: string
  ended: boolean
}

export function projectHistory(events: readonly HistoryEvent[]): HistoryProjection | null {
  let promptIndex = -1
  let parsed: Pick<SelectionAskInput, 'selection' | 'question'> | null = null
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const candidate = parseSelectionAskPrompt(userText(events[index]!))
    if (candidate === null) continue
    promptIndex = index
    parsed = candidate
    break
  }
  if (parsed === null) return null
  const promptSeq = events[promptIndex]!.seq
  const after = events.filter(event => event.seq > promptSeq)
  const finalized = after.filter(event => event.type === 'assistant/message').at(-1)
  let answer = ''
  let reasoning = ''
  if (finalized?.type === 'assistant/message') {
    for (const block of finalized.data.message.content) {
      if (block.type === 'text') answer += block.text
      else if (block.type === 'reasoning') reasoning += block.text
    }
  } else {
    for (const event of after) {
      if (event.type !== 'assistant/chunk') continue
      if (event.data.chunk.type === 'text-delta') answer += event.data.chunk.text
      else if (event.data.chunk.type === 'reasoning-delta') reasoning += event.data.chunk.text
    }
  }
  return {
    ...parsed,
    answer,
    reasoning,
    ended: after.some(event => event.type === 'turn/end'),
  }
}

export class SelectionAskController {
  readonly store: SnapshotStore<SelectionAskState> = createSnapshotStore(INITIAL_STATE, { flush: 'raf' })
  readonly historyStore: SnapshotStore<SelectionAskHistoryState> = createSnapshotStore(INITIAL_HISTORY_STATE)

  private operation: QueryOperation | null = null
  private disposed = false
  private readonly subscriptions: (() => void)[] = []
  private readonly archiving = new Set<SessionId>()

  constructor(private readonly deps: SelectionAskControllerDeps) {
    const reconcile = (): void => { this.reconcileHistory() }
    this.subscriptions.push(deps.sessions.list.subscribe(reconcile), deps.workspaces.list.subscribe(reconcile))
    reconcile()
  }

  start(input: SelectionAskInput): Promise<void> {
    if (this.disposed || this.operation !== null) return Promise.resolve()
    const validation = this.validate(input)
    if (validation !== null) {
      this.store.set({ ...INITIAL_STATE, phase: 'error', error: validation })
      return Promise.resolve()
    }
    const operation: QueryOperation = {
      abort: new AbortController(),
      done: Promise.resolve(),
      childSessionId: null,
      sourceSessionId: input.sourceSessionId,
    }
    this.operation = operation
    this.store.set({ ...INITIAL_STATE, phase: 'preparing' })
    operation.done = this.run(operation, {
      ...input,
      selection: input.selection.trim(),
      question: input.question.trim(),
    })
    return operation.done
  }

  async cancel(): Promise<void> {
    const operation = this.operation
    if (operation === null) return
    operation.abort.abort()
    this.publish(operation, state => { state.phase = 'cancelled'; state.error = null })
    if (operation.childSessionId !== null) {
      await this.deps.api.cancel({ sessionId: operation.childSessionId }).catch(() => undefined)
    }
    await operation.done
  }

  async reset(): Promise<void> {
    await this.cancel()
    if (!this.disposed) this.store.set(INITIAL_STATE)
  }

  openHistory(sourceSessionId: SessionId): void {
    this.historyStore.update(state => { state.openBySource[sourceSessionId] = true })
    const selected = this.historyStore.getSnapshot().selectedBySource[sourceSessionId]
    const first = this.itemsFor(sourceSessionId)[0]
    if (selected === undefined && first !== undefined) this.selectHistory(sourceSessionId, first.childSessionId)
  }

  closeHistory(sourceSessionId: SessionId): void {
    this.historyStore.update(state => { state.openBySource[sourceSessionId] = false })
  }

  selectHistory(sourceSessionId: SessionId, childSessionId: SessionId): void {
    const item = this.historyStore.getSnapshot().items.find(candidate =>
      candidate.sourceSessionId === sourceSessionId && candidate.childSessionId === childSessionId)
    if (item === undefined) return
    this.historyStore.update(state => {
      state.selectedBySource[sourceSessionId] = childSessionId
      state.openBySource[sourceSessionId] = true
    })
    if (!item.loaded) void this.hydrateHistoryItem(childSessionId)
  }

  async dispose(): Promise<void> {
    this.disposed = true
    for (const unsubscribe of this.subscriptions.splice(0)) unsubscribe()
    await this.cancel()
  }

  private itemsFor(sourceSessionId: SessionId): SelectionAskHistoryItem[] {
    return this.historyStore.getSnapshot().items
      .filter(item => item.sourceSessionId === sourceSessionId)
      .sort((left, right) => right.updatedAt - left.updatedAt)
  }

  private reconcileHistory(): void {
    if (this.disposed) return
    const sessions = this.deps.sessions.list.getSnapshot()
    const archived = new Set(this.deps.workspaces.list.getSnapshot().archivedSessionIds)
    for (const id of sessions.ids) {
      const summary = sessions.byId[id]
      if (summary?.parentId === undefined || !summary.title?.startsWith(SELECTION_ASK_TITLE_PREFIX)) continue
      this.upsert({
        childSessionId: id,
        sourceSessionId: summary.parentId,
        selection: '',
        question: summary.title.slice(SELECTION_ASK_TITLE_PREFIX.length),
        answer: '',
        reasoning: '',
        phase: summary.running ? 'streaming' : 'complete',
        modelLabel: null,
        error: null,
        updatedAt: summary.updatedAt,
        loaded: false,
      }, false)
      if (!archived.has(id) && !this.archiving.has(id)) {
        this.archiving.add(id)
        if (sessions.current === id) this.deps.sessions.open(summary.parentId)
        void this.deps.workspaces.archiveSession(id).finally(() => { this.archiving.delete(id) })
      }
    }
  }

  private upsert(item: SelectionAskHistoryItem, replace: boolean): void {
    this.historyStore.update(state => {
      const index = state.items.findIndex(candidate => candidate.childSessionId === item.childSessionId)
      if (index < 0) state.items.push(item)
      else if (replace) state.items[index] = item
    })
  }

  private async fetchProjection(childSessionId: SessionId, signal?: AbortSignal): Promise<HistoryProjection | null> {
    const response = await this.deps.api.history({ sessionId: childSessionId, maxMessages: 100 }, signal)
    if (!response.result.ok) {
      throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
    }
    return projectHistory(response.result.value.events.map(entry => entry.event))
  }

  private async hydrateHistoryItem(childSessionId: SessionId): Promise<void> {
    const item = this.historyStore.getSnapshot().items.find(candidate => candidate.childSessionId === childSessionId)
    if (item === undefined || item.loaded) return
    try {
      const projection = await this.fetchProjection(childSessionId)
      if (projection === null) throw new Error('无法从会话日志恢复引用问答')
      this.upsert({
        ...item,
        ...projection,
        phase: projection.ended ? 'complete' : 'cancelled',
        loaded: true,
      }, true)
    } catch (error) {
      this.upsert({ ...item, phase: 'error', error: errorText(error), loaded: true }, true)
    }
  }

  private validate(input: SelectionAskInput): string | null {
    if (input.selection.trim() === '') return 'selected text is empty'
    if (input.question.trim() === '') return 'question is empty'
    if (input.selection.length > MAX_SELECTION_CHARACTERS) return `selected text exceeds ${MAX_SELECTION_CHARACTERS} characters`
    if (input.question.length > MAX_QUESTION_CHARACTERS) return `question exceeds ${MAX_QUESTION_CHARACTERS} characters`
    return null
  }

  private async waitForIdle(source: SessionFace, signal: AbortSignal): Promise<void> {
    if (!source.getSnapshot().running) return
    await new Promise<void>((resolve, reject) => {
      let unsubscribe = (): void => {}
      const abort = (): void => { unsubscribe(); reject(new QueryCancelled('selected-text query cancelled')) }
      const inspect = (): void => {
        if (!source.getSnapshot().running) { unsubscribe(); signal.removeEventListener('abort', abort); resolve() }
      }
      unsubscribe = source.subscribe(inspect)
      signal.addEventListener('abort', abort, { once: true })
      inspect()
    })
  }

  private async run(operation: QueryOperation, input: SelectionAskInput): Promise<void> {
    try {
      const source = this.deps.sessions.binding(input.sourceSessionId)?.session
      if (source === undefined) throw new Error('当前对话不可用')
      if (source.getSnapshot().running) {
        this.publish(operation, state => { state.phase = 'waiting' })
        await this.waitForIdle(source, operation.abort.signal)
      }
      throwIfAborted(operation.abort.signal)
      const boundarySeq = latestCompletedTurnSeq(source.getSnapshot())
      if (boundarySeq === undefined) throw new Error('当前对话还没有可用于上下文的完整回答')

      const models = await this.deps.api.models({ sessionId: input.sourceSessionId }, operation.abort.signal)
      if (!models.result.ok) throw new Error(`${models.result.error.code}: ${models.result.error.message}`)
      const currentModel = models.result.value.current
      this.publish(operation, state => { state.modelLabel = modelLabel(currentModel) })

      const childSessionId = await this.deps.sessions.fork({ sessionId: input.sourceSessionId, atSeq: boundarySeq })
      operation.childSessionId = childSessionId
      throwIfAborted(operation.abort.signal)

      const renamed = await this.deps.api.rename({
        sessionId: childSessionId,
        title: selectedTextQuestionTitle(input.question),
      }, operation.abort.signal)
      if (!renamed.result.ok) throw new Error(`${renamed.result.error.code}: ${renamed.result.error.message}`)
      await this.deps.workspaces.archiveSession(childSessionId)

      const selected = await this.deps.api.selectModel({
        sessionId: childSessionId,
        provider: currentModel.provider,
        model: currentModel.model,
        ...(currentModel.reasoningEffort === undefined ? {} : { reasoningEffort: currentModel.reasoningEffort }),
      }, operation.abort.signal)
      if (!selected.result.ok) throw new Error(`${selected.result.error.code}: ${selected.result.error.message}`)

      this.upsert({
        childSessionId,
        sourceSessionId: input.sourceSessionId,
        selection: input.selection,
        question: input.question,
        ...this.store.getSnapshot(),
        phase: 'preparing',
        updatedAt: Date.now(),
        loaded: true,
      }, true)
      this.historyStore.update(state => {
        state.selectedBySource[input.sourceSessionId] = childSessionId
        state.openBySource[input.sourceSessionId] = true
      })

      const prompted = await this.deps.api.prompt({
        sessionId: childSessionId,
        mode: 'queue',
        content: [{ type: 'text', text: buildSelectionAskPrompt(input) }],
      }, operation.abort.signal)
      if (!prompted.result.ok) throw new Error(`${prompted.result.error.code}: ${prompted.result.error.message}`)
      this.publish(operation, state => { state.phase = 'streaming' })

      while (true) {
        throwIfAborted(operation.abort.signal)
        const projection = await this.fetchProjection(childSessionId, operation.abort.signal)
        if (projection !== null) {
          this.publish(operation, state => {
            state.answer = projection.answer
            state.reasoning = projection.reasoning
            if (projection.ended) state.phase = 'complete'
          })
          if (projection.ended) break
        }
        await delay(400, operation.abort.signal)
      }
    } catch (error) {
      if (!(error instanceof QueryCancelled) && !operation.abort.signal.aborted) {
        this.publish(operation, state => { state.phase = 'error'; state.error = errorText(error) })
      }
    } finally {
      if (this.operation === operation) this.operation = null
    }
  }

  private publish(operation: QueryOperation, change: (state: SelectionAskState) => void): void {
    if (this.disposed || this.operation !== operation) return
    const next = { ...this.store.getSnapshot() }
    change(next)
    this.store.set(next)
    if (operation.childSessionId === null) return
    this.historyStore.update(state => {
      const item = state.items.find(candidate => candidate.childSessionId === operation.childSessionId)
      if (item === undefined) return
      item.phase = next.phase
      item.answer = next.answer
      item.reasoning = next.reasoning
      item.modelLabel = next.modelLabel
      item.error = next.error
      item.updatedAt = Date.now()
      item.loaded = true
    })
  }
}
