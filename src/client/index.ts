import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { SelectionAskController } from './controller.ts'
import { SelectionAskApp, type SelectionAskInjected } from './SelectionAskApp.tsx'
import { en, NS, zh, type SelectionAskKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    selectionAskStandalone: SelectionAskKey
  }
}

export const inject = ['connection', 'sessions', 'workspaces', 'slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-selection-ask: dictionaries')
  const connection = ctx.get('connection') as ConnectionHandle
  const controller = new SelectionAskController({
    sessions: ctx.sessions,
    workspaces: ctx.workspaces,
    api: connection.api.sessions,
  })
  const injected = (): SelectionAskInjected => ({
    hooks: { selectionQuery: controller.store, selectionAskHistory: controller.historyStore },
    ask: input => controller.start(input),
    cancel: () => controller.cancel(),
    reset: () => controller.reset(),
    openHistory: sourceSessionId => { controller.openHistory(sourceSessionId) },
    closeHistory: sourceSessionId => { controller.closeHistory(sourceSessionId) },
    selectHistory: (sourceSessionId, childSessionId) => { controller.selectHistory(sourceSessionId, childSessionId) },
  })
  ctx.effect(() => () => { void controller.dispose() }, 'dsh-selection-ask: controller')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'selection-ask',
    order: 30,
    locale: NS,
    inject: injected,
  }, SelectionAskApp))
}
