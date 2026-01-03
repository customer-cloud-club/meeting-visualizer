---
description: 追加要件を要件定義に追記（CMD-002）
---

# Add Requirements Command

CCAGI SDK Phase 1 コマンド (CMD-002)

既存の要件定義に追加要件を追記します。

## 使用方法

```bash
/add-requirements <text>
```

## パラメータ

- `text` (必須): 追加する要件のテキスト
  - 自然言語で記述可能
  - 複数行対応

## 実行フロー

```mermaid
graph TD
    A[/add-requirements text] --> B[θ₁ テキスト解析]
    B --> C[θ₂ 要件構造化]
    C --> D[θ₃ 既存要件との整合性確認]
    D --> E[θ₄ additional.md に追記]
    E --> F[θ₅ 重複・矛盾チェック]
    F --> G[θ₆ 更新完了]
```

## 出力先

```
docs/requirements/additional.md
```

## 前提条件

このコマンドはCMD-001 (`/generate-requirements`) の実行後に使用できます。

```
依存関係: CMD-001 → CMD-002
```

## 実行例

### 基本的な使用

```bash
/add-requirements "多要素認証（MFA）をサポートする必要がある。SMS認証とTOTP認証の両方に対応すること。"
```

**期待される出力**:

```
📝 CCAGI Requirements Adder (CMD-002)

Phase 1: Requirements Amendment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ 入力テキスト解析完了
   🔍 要件タイプ: 機能要件 (Security)

θ₂ Generating...
   ✅ 構造化要件生成

θ₃ Allocating...
   ✅ FR-043: MFA基本機能
   ✅ FR-044: SMS認証
   ✅ FR-045: TOTP認証

θ₄ Executing...
   📝 additional.md 更新

θ₅ Integrating...
   ✅ 既存要件との整合性: OK
   ✅ 重複チェック: 0件
   ✅ 矛盾チェック: 0件

θ₆ Learning...
   📊 要件パターン学習完了

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Requirements Added Successfully

追加要件数: 3
更新ファイル: docs/requirements/additional.md
総要件数: 45 (+3)

次のステップ:
  /generate-diagram sequence  # シーケンス図生成
```

### 複数要件の追加

```bash
/add-requirements "
1. ユーザーは過去30日分のログイン履歴を確認できる
2. 不正ログイン検知時に管理者に通知する
3. セッションタイムアウトは30分とする
"
```

## 出力ファイル形式

### additional.md

```markdown
# 追加要件

## 更新履歴

| 日時 | 要件ID | 説明 |
|------|--------|------|
| 2025-01-15 10:30 | FR-043~045 | MFA機能追加 |

---

## FR-043: MFA基本機能
- **優先度**: High
- **カテゴリ**: Security
- **説明**: 多要素認証をサポートする
- **受入基準**:
  - [ ] MFA設定画面が表示される
  - [ ] MFAの有効/無効を切り替えられる

## FR-044: SMS認証
- **優先度**: High
- **カテゴリ**: Security
- **説明**: SMSによるワンタイムパスワード認証
- **受入基準**:
  - [ ] 電話番号登録画面
  - [ ] SMS送信・検証機能

## FR-045: TOTP認証
- **優先度**: High
- **カテゴリ**: Security
- **説明**: TOTP（Time-based One-Time Password）認証
- **受入基準**:
  - [ ] QRコード表示機能
  - [ ] TOTP検証機能
```

## 依存関係

**依存元**:
- CMD-001: /generate-requirements (必須)

**依存先**:
- なし (Phase 2以降のコマンドが参照)

## トラブルシューティング

### Q1: 「前提コマンドが未実行」エラー

```
Error: CMD-001 (generate-requirements) has not been executed

対処法:
先に /generate-requirements を実行してください
```

### Q2: 重複要件の警告

```
Warning: Similar requirement already exists (FR-012)

対処法:
1. 既存要件を確認
2. 本当に追加が必要か判断
3. --force オプションで強制追加
```

## 関連コマンド

- [/generate-requirements](./generate-requirements.md) - 要件自動生成 (CMD-001)
- [/generate-diagram](./generate-diagram.md) - 設計図生成 (CMD-003~005)

---

🤖 CCAGI SDK v6.15.0 - Phase 1: Requirements (CMD-002)
