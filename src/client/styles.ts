export const STYLE_ID = 'gethshap-dsh-selection-ask'

export const CSS = `
.gsa-root{position:fixed;z-index:240;inset:0;pointer-events:none;color:var(--dsw-alias-label-primary)}
.gsa-root *{box-sizing:border-box}.gsa-root button,.gsa-root textarea{font:inherit}
.gsa-bubble,.gsa-panel,.gsa-launch,.gsa-sidebar{position:fixed;pointer-events:auto}
.gsa-bubble,.gsa-launch{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:7px 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);cursor:pointer}
.gsa-bubble:hover,.gsa-launch:hover{background:var(--dsw-alias-button-floating-hover)}
.gsa-launch{top:72px;right:14px}.gsa-count{display:grid;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:var(--dsw-alias-interactive-bg-active);place-items:center;font:var(--dsw-font-xxxs-11)}
.gsa-panel{display:flex;width:440px;max-width:calc(100vw - 24px);max-height:min(620px,calc(100vh - 24px));flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv3)}
.gsa-header,.gsa-footer{display:flex;flex:none;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}.gsa-footer{border-top:1px solid var(--dsw-alias-border-l1);border-bottom:0}
.gsa-title{display:inline-flex;align-items:center;gap:7px;font:var(--dsw-font-s-strong-14)}.gsa-icon{display:grid;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;place-items:center}.gsa-icon:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.gsa-body{display:flex;min-height:0;flex:1;flex-direction:column;gap:9px;padding:12px;overflow:auto}.gsa-label{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-strong-13)}
.gsa-quote,.gsa-answer,.gsa-reasoning{margin:0;padding:9px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font:var(--dsw-font-xs-13);line-height:20px;overflow-wrap:anywhere}.gsa-quote{max-height:120px;overflow:auto;border-left:3px solid var(--dsw-alias-brand-primary);white-space:pre-wrap}
.gsa-quick{display:flex;gap:6px}.gsa-quick button,.gsa-secondary,.gsa-primary{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;padding:5px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}.gsa-primary{border:0;background:var(--dsw-alias-brand-primary);color:white}.gsa-primary:disabled{opacity:.5;cursor:not-allowed}
.gsa-question{width:100%;min-height:76px;padding:9px 10px;resize:vertical;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;outline:none;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);line-height:20px}.gsa-question:focus{border-color:var(--dsw-alias-brand-primary)}
.gsa-status{display:flex;flex-direction:column;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}.gsa-error{padding:8px 10px;border-radius:8px;background:var(--dsw-alias-state-error-secondary);color:var(--dsw-alias-label-error)}
.gsa-sidebar{z-index:3;top:0;right:0;display:flex;width:min(440px,calc(100vw - 40px));height:100vh;flex-direction:column;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);box-shadow:var(--dsw-shadow-lv3)}
.gsa-history{display:flex;max-height:190px;flex:none;flex-direction:column;gap:4px;padding:8px;overflow:auto;border-bottom:1px solid var(--dsw-alias-border-l1)}.gsa-history button{display:flex;min-width:0;flex-direction:column;gap:2px;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer}.gsa-history button:hover,.gsa-history button[data-selected]{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}.gsa-history span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gsa-history small{color:var(--dsw-alias-label-tertiary)}
.gsa-sidebar-question{padding:9px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
`

export function installStyles(): () => void {
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {}
  const element = document.createElement('style')
  element.dataset.plugin = '@gethshap/dsh-selection-ask'
  element.dataset.pluginCss = STYLE_ID
  element.textContent = CSS
  document.head.append(element)
  return () => { element.remove() }
}
