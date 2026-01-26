<p align="center">
  <img src="../../resources/icons/icon-128.png" width="80" alt="Logo" />
</p>

<h1 align="center">触词翻译</h1>

<p align="center">
    <b>像做笔记一样翻译网页</b>
</p>

<p align="center">
    <br> 
    <a href="../../README.md">English</a> | 
    <b>简体中文</b> | 
    <a href="README-DE.md">Deutsch</a> | 
    <a href="README-ES.md">Español</a> | 
    <a href="README-FR.md">Français</a> | 
    <a href="README-JA.md">日本語</a> | 
    <a href="README-KO.md">한국어</a> | 
    <a href="README-RU.md">Русский</a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/bjcaamcpfbhldgngnfmnmcdkcmdmhebb" target="_blank">
    <img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/stars/bjcaamcpfbhldgngnfmnmcdkcmdmhebb?color=F472B6&label=Chrome&style=flat-square&logo=google-chrome&logoColor=white" />
  </a>
  <a href="LICENSE.txt" target="_blank">
    <img alt="License" src="https://img.shields.io/badge/License-AGPL--3.0-4ADE80?style=flat-square" />
  </a>
  <img alt="TypeScript" src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
</p>

---

![TapWord 翻译助手演示](../../resources/public/demo.gif)

## 📖 产品介绍

将 AI 翻译**直接显示在原文下方**，就像电影字幕或书本批注一样自然。

核心理念很简单：**不打断阅读心流**。在你需要的时候提供高质量的 AI 翻译，让你始终保持沉浸式阅读体验。

> 这是 TapWord 翻译助手的**社区开源版本**。完全开源，注重隐私保护，支持使用你自己的 API Key（OpenAI、DeepSeek 或任何兼容 OpenAI 格式的服务商）。

## ⭐ 核心特色

### 笔记式翻译
翻译内容以**字幕形式直接显示在原文下方**。没有弹窗，不会跳转。就像在网页上做笔记一样，完全不会打断你的阅读节奏。

### AI 智能翻译
采用先进的大语言模型（LLM），能够理解**完整的上下文语境**，提供的翻译比传统工具更准确、更符合语境。

### 智能选词
只选中单词的部分文本，扩展程序会**自动扩展到完整单词**。无需精确选择，只要划中任意部分，就能翻译完整单词。


## 🚀 安装方式

### 方式一：Chrome 应用商店（免费）
官方版本可免费使用。

[**从 Chrome 应用商店安装**](https://chromewebstore.google.com/detail/bjcaamcpfbhldgngnfmnmcdkcmdmhebb)

### 方式二：自己构建社区版
如果你更喜欢**使用自己的 API Key**，可以自行构建：

1.  **克隆代码仓库**
    ```bash
    git clone https://github.com/hongyuan007/tapword-translator-plugin.git
    cd tapword-translator-plugin
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **构建项目**
    ```bash
    npm run build:community
    ```

4.  **加载到 Chrome**
    - 打开 Chrome 浏览器，访问 `chrome://extensions/`
    - 打开右上角的**开发者模式**
    - 点击**加载已解压的扩展程序**
    - 选择第 3 步生成的 `dist` 文件夹

## ⚙️ 配置说明（社区版）

30 秒即可开始使用：

1.  点击浏览器工具栏的扩展图标，打开**弹窗**
2.  点击**设置**图标（齿轮），进入选项页面
3.  找到"自定义 API"（社区版必须配置）
4.  填写你的 **API 配置**：
    - **API Key**：`sk-.......`
    - **模型**：`gpt-3.5-turbo`、`gpt-4o` 或其他兼容模型
    - **API 地址**：默认为 `https://api.openai.com/v1`，也可以改成代理地址或其他服务商（如 DeepSeek、Moonshot）
5.  保存后即可使用！

## 🛠 开发指南

技术栈：**TypeScript**、**Vite**、**纯 HTML/CSS**。

### 项目结构
```
src/
├── 1_content/       # 注入到网页的脚本（页面上看到的 UI）
├── 2_background/    # 后台服务（API 调用、右键菜单）
├── 3_popup/         # 扩展弹窗界面
├── 5_backend/       # 共享 API 服务
├── 6_translate/     # 翻译业务逻辑
└── 8_generate/      # LLM 提示词工程与响应解析
```

### 常用命令

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev:community` | 启动开发服务器（社区版配置，监听模式） |
| `npm run build:community` | 构建生产版本（社区版配置） |
| `npm type-check` | 运行 TypeScript 类型检查 |
| `npm test` | 使用 Vitest 运行单元测试 |

### 架构说明：双版本构建系统
我们使用编译时环境变量来区分社区版和官方版逻辑：
- **社区版构建**：`VITE_APP_EDITION=community`。禁用私有云端逻辑，强制使用自定义 API，剔除语音合成（TTS）代码
- **官方版构建**：（私有）包含私有服务器逻辑

## 👏 参与贡献

我们是一个由语言学习者和阅读爱好者组成的社区。如果你有新想法、UI 建议或发现了 Bug，欢迎贡献代码，我们热烈欢迎 Pull Request！

1.  Fork 这个项目
2.  创建你的功能分支（`git checkout -b feature/AmazingFeature`）
3.  提交你的修改（`git commit -m 'Add some AmazingFeature'`）
4.  推送到分支（`git push origin feature/AmazingFeature`）
5.  提交 Pull Request

## 📄 开源协议

本项目采用 **AGPL-3.0 协议**。详见 `LICENSE.txt`。

---

<p align="center">
  用 ❤️ 为全球读者打造
</p>
