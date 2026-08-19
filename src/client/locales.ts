export const NS = 'selectionAskStandalone'

export const zh = {
  ask: '询问选中文本', title: '询问选中文本', close: '关闭', quote: '引用内容', question: '具体问题',
  placeholder: '针对这段内容提出问题…', explain: '解释', summarize: '总结', translate: '翻译', send: '询问', stop: '停止',
  copy: '复制回答', copied: '已复制', history: '引用问答', historyAria: '打开当前对话的 {count} 条引用问答',
  historyList: '引用问答记录', bound: '仅绑定当前对话', loading: '正在读取历史回答…', reasoning: '思考过程',
  empty: '模型没有返回可显示的文本。', model: '当前模型：{model}', waiting: '等待当前回答完成…',
  preparing: '正在准备独立问答…', streaming: '正在回答…', complete: '回答完成', cancelled: '已停止', error: '提问失败',
  promptExplain: '请结合当前对话上下文，具体解释这段内容。',
  promptSummarize: '请结合当前对话上下文，总结这段内容的重点。',
  promptTranslate: '请结合当前对话上下文，把这段内容翻译成简体中文。',
} as const

export type SelectionAskKey = keyof typeof zh

export const en: Record<SelectionAskKey, string> = {
  ask: 'Ask about selection', title: 'Ask about selected text', close: 'Close', quote: 'Quoted text', question: 'Question',
  placeholder: 'Ask a specific question about this text…', explain: 'Explain', summarize: 'Summarize', translate: 'Translate', send: 'Ask', stop: 'Stop',
  copy: 'Copy answer', copied: 'Copied', history: 'Selected-text questions', historyAria: 'Open {count} selected-text questions for this session',
  historyList: 'Selected-text question history', bound: 'Bound only to this session', loading: 'Loading saved answer…', reasoning: 'Reasoning',
  empty: 'The model returned no displayable text.', model: 'Current model: {model}', waiting: 'Waiting for the current answer…',
  preparing: 'Preparing an independent question…', streaming: 'Answering…', complete: 'Answer complete', cancelled: 'Stopped', error: 'Question failed',
  promptExplain: 'Explain this text in detail using the current conversation context.',
  promptSummarize: 'Summarize the key points of this text using the current conversation context.',
  promptTranslate: 'Translate this text into Simplified Chinese using the current conversation context.',
}
