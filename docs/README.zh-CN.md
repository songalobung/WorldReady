<div align="center">

# 🌐 WorldReady (中文版)

### 面向 AI 编程智能体的国际化工程系统
**发现缺陷 · 修复问题 · 验证成效**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

[English](../README.md) | [简体中文](README.zh-CN.md) | [العربية (RTL)](README.ar.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

<p align="center">
  <b>为 AI 编程智能体和持续集成 (CI) 流水线打造的开源国际化 (i18n) 与 RTL 双向文本审计与回归验证系统。</b>
</p>

</div>

---

## 🎯 核心价值

> **赋予 AI 编程智能体一个代码仓库，WorldReady 能精准识别国际化缺陷、解释其技术影响、生成安全修复方案，并通过自动化测试验证修复结果。**

我们的核心差异在于：**事实胜于建议 (Proof, not advice)**。

AI 助手单纯回复“你的阿拉伯语界面看起来没问题”是远远不够的。WorldReady 会输出确定性的代码行号凭据、AST 结构级测试结果与可重现的 CI 审计报告。

---

## 🌟 五大核心优势

1. **框架无关的 AST 静态分析**：不同于脆弱的正则匹配，WorldReady 深入解析 TypeScript/JavaScript (TSX/JSX)、HTML (parse5)、CSS (PostCSS) 以及 JSON/ICU 语言包 AST 树，支持 Next.js、React、Vue、Svelte 等现代 Web 技术栈。
2. **一流的 RTL 与双向文本 (BiDi) 工程支持**：文本方向是**文字系统 (Script)** 的属性，而非单一语言代码。WorldReady 严格遵循 W3C 标准，检测缺失的 `dir` 属性、破坏镜像翻转的物理 CSS 属性（如 `margin-left`，建议使用 `margin-inline-start`），以及多语言混排时的 `<bdi>` 隔离。
3. **真实区域规则测试**：依托 Unicode CLDR（通用区域数据仓库）标准，校验数字、货币、日期格式化与各语言多复数类别（Cardinal/Ordinal）。
4. **确定性“修复与验证”闭环**：`审计 (Audit) ➔ 解释 (Explain) ➔ 建议方案 (Propose) ➔ 应用修复 (Apply) ➔ 再次审计 (Re-audit)`。只有通过回归校验的修改才被认定为已完成。
5. **本地运行，零外部 AI 依赖**：审计核心 100% 本地离线执行，无需外网或第三方模型 API，保护企业专有代码隐私。

---

## ⚡ 快速上手

```bash
# 1. 初始化配置 (自动检测 Next.js, i18next, next-intl 等)
npx worldready init

# 2. 运行国际化与 RTL 审计
npx worldready audit

# 3. 指定目标语言进行审计
npx worldready audit --locales en,zh-CN,ar,ja

# 4. 生成符合 GitHub Security 标准的 SARIF 报告
npx worldready audit --format sarif -o worldready.sarif

# 5. 执行严格 CI 检查 (存在错误时以代码 1 退出)
npx worldready ci

# 6. 利用伪本地化测试界面排版与截断问题
npx worldready test --locale en-XA
npx worldready test --locale ar-XB
```

---

## 📋 核心规则目录

- **WRD001** (硬编码界面文本): 检查 JSX/TSX 标签与 UI 属性中未翻译的文案。
- **WRD002** (动态文本拼接): 检测破坏目标语言语序的字符连接与模板字符串。
- **WRD101** (缺失翻译键值): 检测源语言存在但目标语言缺失的字典项。
- **WRD102** (未引用翻译键值): 清理不再使用的过时翻译。
- **WRD103** (占位符不匹配): 校验 `{name}` 等动态变量在各语言版本中的一致性。
- **WRD301** (RTL 声明缺失): 检查阿拉伯语/希伯来语等环境下的 `dir="rtl"` 声明。
- **WRD302** (物理 CSS 方向属性): 提示将 `margin-left`/`padding-right` 转换为逻辑属性。
- **WRD401** (区域不敏感格式化): 检测未传语言参数的原生日期或货币格式化。

---

## 📄 开源许可证

本项目基于 **Apache License, Version 2.0** 许可证开源。详情请见 [LICENSE](../LICENSE)。

