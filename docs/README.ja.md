<div align="center">

# 🌐 WorldReady (日本語)

### AI コーディングエージェントのための国際化エンジニアリングシステム
**検出 · 修正 · 実行可能テストによる証明**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

[English](../README.md) | [简体中文](README.zh-CN.md) | [العربية (RTL)](README.ar.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

<p align="center">
  <b>AI コーディングエージェントと CI パイプライン向けに構築された、確定的な国際化 (i18n) および RTL 監査システム。</b>
</p>

</div>

---

## 🎯 コアコンセプト

> **リポジトリを AI エージェントに渡すだけで、WorldReady は国際化の欠陥を特定し、その影響を解説し、安全な修正案を提示し、実行可能なテストで検証します。**

最大の違いは **「アドバイスではなく、確固たる証拠 (Proof, not advice)」** である点です。

「アラビア語のレイアウトは問題なさそうです」というエージェントの返答だけでは不十分です。WorldReady はファイル行番号付きの客観的証拠、AST 構文木レベルの検証結果、再現性の高いテストを提供します。

---

## 🌟 5 つの大きな特徴

1. **フレームワーク非依存の AST 解析**: 壊れやすい正規表現に頼らず、TypeScript/JavaScript (TSX/JSX)、HTML (parse5)、CSS (PostCSS)、JSON/ICU を完全な AST として解析します。
2. **第一級の RTL (右書き) および双方向テキスト (BiDi) サポート**: 文字の書字方向は言語コードではなく **スクリプト (Script)** の属性です (W3C 基準)。`dir` 属性の欠落、レイアウト反転を妨げる物理 CSS プロパティ (`margin-left` など) を検出し、CSS 論理プロパティ (`margin-inline-start`) への置き換えを提案します。
3. **Unicode CLDR に準拠したロケール動作テスト**: 通貨記号、日付、数値フォーマット、複数形規則 (Cardinal/Ordinal) への準拠を検証します。
4. **確実な修正・検証ループ**: `監査 (Audit) ➔ 解説 (Explain) ➔ 提案 (Propose) ➔ 修正適用 (Apply) ➔ 再監査 (Re-audit)`。再監査で欠陥ゼロが証明されるまで修正は完了しません。
5. **完全ローカル動作 (外部 AI API 不要)**: 外部ネットワークや外部モデルへの依存がなく、ソースコードが端末外に送信されることはありません。

---

## ⚡ クイックスタート

```bash
# 1. 設定の初期化 (Next.js、i18next などを自動検出)
npx worldready init

# 2. i18n & RTL 監査の実行
npx worldready audit

# 3. 特定の言語を指定して監査
npx worldready audit --locales en,ja,ar,fr

# 4. GitHub セキュリティ連携用の SARIF レポート出力
npx worldready audit --format sarif -o worldready.sarif

# 5. CI 環境での厳密チェック
npx worldready ci

# 6. 疑似ローカライゼーションによる文字あふれ・レイアウト検証
npx worldready test --locale en-XA
npx worldready test --locale ar-XB
```

---

## 📄 ライセンス

本プロジェクトは **Apache License 2.0** のもとで公開されています。詳細は [LICENSE](../LICENSE) をご確認ください。

