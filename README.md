# DSH Selection Ask

[简体中文](README.md) | [English](README_EN.md)

为 [DeepSeek Harness](https://github.com/gethshap/deepseek-harness) Web UI 增加“选中文字后结合当前对话上下文追问”的独立插件。

特性：

- 鼠标选中文字后显示嵌入式提问面板；
- 从当前对话的最近完整回答处分叉，沿用当前模型和上下文；
- 问答保存在隐藏的子对话中，不污染原对话；
- 当前对话有历史记录时，显示独立右侧栏入口；切换对话后只显示对应记录；
- 插件同时包含 DSH bundle patch 和浏览器客户端，可作为一个 `.tgz` 安装。

## 使用指南：DSH 上下文点读机

> **DSH 上下文点读机，哪里不会点哪里。** 当然不是拿鼠标把显示器戳出指纹——框选文字就行。

1. 打开一个已经聊过几轮的 DSH 对话。插件会从最近一次完整回答处分叉，因此模型不仅看得到你选中的句子，也记得这句话前面发生了什么。
2. 用鼠标框选想追问的文字。选完后，旁边会冒出一个 **“询问选中文本”** 按钮，像课代表一样主动举手。
3. 点击按钮后，可以直接选择 **解释、总结、翻译**，也可以自己输入更具体的问题。例如：“这个参数为什么是 `1.0`？”或“这句话在当前方案里有什么风险？”
4. 点击 **询问**，或者按 `Ctrl+Enter` 发送。插件会建立一个隐藏的子对话，沿用当前模型和上下文完成回答，不会把引用问答塞进原对话里假装什么都没发生。
5. 回答会显示在独立面板中。完成过至少一次引用问答后，页面右上方会出现 **“引用问答”** 入口；打开后即可在独立右侧栏里翻看往期记录。
6. 右侧栏与原对话一一绑定。切换到别的对话时，它不会追着你跑；切回来，之前点读过的内容仍然在。

一句话版：**哪里不会选哪里，选完就问；点的不是屏幕，是上下文。**

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
