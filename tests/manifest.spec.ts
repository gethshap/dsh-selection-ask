import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('standalone package manifest', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  it('contains both the bundle patch and browser client entry', () => {
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.exports['./client'].default).toBe('./lib/client.js')
    expect(manifest.files).toContain('cordis.patch.yml')
  })

  it('does not depend on workspace-only versions', () => {
    expect(JSON.stringify(manifest)).not.toContain('workspace:')
  })
})
