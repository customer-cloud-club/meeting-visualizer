---
description: ユーザーマニュアルを自動生成（CMD-018）
---

# Generate User Manual Command

CCAGI SDK Phase 6 コマンド (CMD-018)

実装とテスト結果からユーザーマニュアルを自動生成します。

## 使用方法

```bash
/generate-user-manual
```

## 実行フロー

```mermaid
graph TD
    A[/generate-user-manual] --> B[θ₁ 実装・テスト読込]
    B --> C[θ₂ 機能抽出]
    C --> D[θ₃ ドキュメント構成]
    D --> E[θ₄ Markdown生成]
    E --> F[θ₅ 整合性検証]
    F --> G[${MANUAL}/*.md]
```

## 出力先

```
docs/manual/
├── getting-started.md
├── user-guide.md
├── faq.md
└── troubleshooting.md
```

## 前提条件

```
依存関係: CMD-017 → CMD-018
```

## 実行例

```bash
/generate-user-manual
```

**期待される出力**:

```
📖 CCAGI User Manual Generator (CMD-018)

Phase 6: Documentation - User Manual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ 実装コード読込
   ✅ E2Eテスト結果読込
   🔍 機能検出: 24機能

θ₂ Generating...
   ✅ 画面キャプチャ生成: 32枚
   ✅ 操作手順抽出

θ₃ Allocating...
   📝 getting-started.md
   📝 user-guide.md
   📝 faq.md
   📝 troubleshooting.md

θ₄ Executing...
   [████████████████████] 100%

θ₅ Integrating...
   ✅ 機能カバレッジ: 100%
   ✅ 整合性チェック: PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ User Manual Generated

出力: docs/manual/
ファイル数: 4
総ページ数: 48
実行時間: 60s

次のステップ:
  /generate-demo-scenario  # デモシナリオ生成
```

## 出力形式

### getting-started.md

```markdown
# はじめに

## インストール

1. リポジトリのクローン
   ```bash
   git clone https://github.com/example/app.git
   ```

2. 依存関係のインストール
   ```bash
   npm install
   ```

3. 開発サーバーの起動
   ```bash
   npm run dev
   ```

## クイックスタート

### 1. アカウント作成

![登録画面](./images/register.png)

1. 「新規登録」ボタンをクリック
2. メールアドレスとパスワードを入力
3. 「登録」ボタンをクリック
```

## 依存関係

**依存元**: CMD-017 (run-e2e-test)
**依存先**: CMD-019 (generate-demo-scenario)

## 関連コマンド

- [/run-e2e-test](./run-e2e-test.md) (CMD-017)
- [/generate-demo-scenario](./generate-demo-scenario.md) (CMD-019)

---

🤖 CCAGI SDK v6.15.0 - Phase 6: Documentation (CMD-018)
