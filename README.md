# DSH Selection Ask

[简体中文](README.md) | [English](README_EN.md)

为 [DeepSeek Harness](https://github.com/gethshap/deepseek-harness) Web UI 增加“选中文字后结合当前对话上下文追问”的独立插件。

特性：

- 鼠标选中文字后显示嵌入式提问面板；
- 从当前对话的最近完整回答处分叉，沿用当前模型和上下文；
- 问答保存在隐藏的子对话中，不污染原对话；
- 当前对话有历史记录时，显示独立右侧栏入口；切换对话后只显示对应记录；
- 插件同时包含 DSH bundle patch 和浏览器客户端，可作为一个 `.tgz` 安装。

## 安装发布包

将 `<release-url>` 换成 GitHub Release 中 `.tgz` 资产的直链：

```powershell
dsh plugin --profile web add <release-url>
```

例如：

```powershell
dsh plugin --profile web add https://github.com/gethshap/dsh-selection-ask/releases/download/v0.1.0/gethshap-dsh-selection-ask-0.1.0.tgz
```

重启 Web 服务后生效：

```powershell
dsh web
```

删除插件：

```powershell
dsh plugin --profile web remove @gethshap/dsh-selection-ask
```

## 从源码构建

要求 Node.js 22.19+ 或 24+，以及 Corepack/pnpm。

```powershell
corepack pnpm install
corepack pnpm test
corepack pnpm run build
corepack pnpm run pack:release
```

产物位于 `dist/gethshap-dsh-selection-ask-0.1.0.tgz`。发布 Git tag（例如 `v0.1.0`）后，GitHub Actions 会重新测试、打包并自动创建 Release、上传该文件。

## 开发安装

也可以直接从本地目录安装：

```powershell
dsh plugin --profile web add D:\path\to\dsh-selection-ask
```

每次修改后先运行 `corepack pnpm run build`，再重启 `dsh web`。正式安装已构建的 `.tgz` 后，日常启动不需要重复构建。

## 兼容性

当前版本面向 DSH `0.1.0-rc.7` 的公开客户端 API。插件没有修改 DSH 核心源码，也不依赖私有 workspace 路径。

## License

MIT
