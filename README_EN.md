# DSH Selection Ask

[简体中文](README.md) | [English](README_EN.md)

A standalone [DeepSeek Harness](https://github.com/gethshap/deepseek-harness) Web UI plugin for asking context-aware questions about selected text.

Features:

- Shows an embedded question panel when text is selected;
- Forks from the latest completed turn of the current conversation, preserving its model and context;
- Stores each answer in a hidden child conversation without polluting the original conversation;
- Provides a dedicated right sidebar for previous selected-text questions;
- Binds history to its source conversation, so only the relevant sidebar appears when switching conversations;
- Ships the DSH bundle patch and browser client together as one installable `.tgz` package.

## Install a Release

Replace `<release-url>` with the direct URL of a `.tgz` asset from GitHub Releases:

```powershell
dsh plugin --profile web add <release-url>
```

For example:

```powershell
dsh plugin --profile web add https://github.com/gethshap/dsh-selection-ask/releases/download/v0.1.0/gethshap-dsh-selection-ask-0.1.0.tgz
```

Restart the Web UI after installation:

```powershell
dsh web
```

To remove the plugin:

```powershell
dsh plugin --profile web remove @gethshap/dsh-selection-ask
```

## Build from Source

Requirements: Node.js 22.19+ or 24+, plus Corepack/pnpm.

```powershell
corepack pnpm install
corepack pnpm test
corepack pnpm run build
corepack pnpm run pack:release
```

The package is written to `dist/gethshap-dsh-selection-ask-0.1.0.tgz`. Pushing a Git tag such as `v0.1.0` triggers GitHub Actions to test and build the project, create a Release, and upload the package automatically.

## Development Installation

You can also install directly from a local checkout:

```powershell
dsh plugin --profile web add D:\path\to\dsh-selection-ask
```

After making changes, run `corepack pnpm run build` and restart `dsh web`. A normal installation from a prebuilt `.tgz` does not need to be rebuilt on every launch.

## Compatibility

This release targets the public client APIs in DSH `0.1.0-rc.7`. It does not modify DeepSeek Harness core source code or depend on private workspace paths.

## Security Model

Selected text is treated as untrusted quoted data. Each question is sent through an isolated child conversation with instructions that prohibit tool use, command execution, file changes, and external actions.

## License

MIT
