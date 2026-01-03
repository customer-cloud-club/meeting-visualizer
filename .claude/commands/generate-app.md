---
name: generate-app
description: 完全なアプリケーションを自動生成（全8フェーズ一括実行）
arguments:
  - name: input
    description: 入力ソース（WebサイトURL / GitHub Issue URL / 要件定義書パス）
    required: true
  - name: --source
    description: 入力ソースタイプを明示（website / issue / doc）
    required: false
  - name: --with-platform
    description: 認証課金基盤を統合
    required: false
  - name: --product-id
    description: Platform SDK Product ID
    required: false
---

# /generate-app - 完全アプリ自動生成

## 概要

入力ソース（URL、GitHub Issue、要件定義書）から完全なアプリケーションを自動生成します。
8つのフェーズを順次実行し、デプロイ可能なアプリを出力します。

## 使用方法

```bash
# WebサイトURLから生成
/generate-app https://example.com

# GitHub Issueから生成
/generate-app https://github.com/org/repo/issues/123

# 要件定義書から生成
/generate-app ./docs/requirements.md

# 認証課金基盤付きで生成
/generate-app https://example.com --with-platform --product-id=PROD_XXX
```

## 対話的セットアップ（自動実行）

コマンド実行時、以下の質問が自動的に表示されます：

### 質問1: 認証機能
```
認証機能を実装しますか？

1. はい - Cognito認証 + Stripe課金を統合（推奨）
2. 認証のみ - Cognito認証のみ統合
3. いいえ - 認証機能なし
```

### 質問2: Product ID（認証機能を選択した場合）
```
CC-Auth Platform の Product ID を入力してください：
（例: PROD_abc123）
>
```

### 質問3: デプロイ環境
```
デプロイ先を選択してください：

1. AWS（推奨）
2. GCP
3. Azure
4. ローカルのみ（デプロイなし）
```

## 実行フロー

```
[対話的セットアップ]
    ↓ 認証機能・デプロイ先を確認
Phase 1: Requirements（要件定義）
    ↓ 入力ソースを解析、要件抽出
Phase 2: Design（設計）
    ↓ シーケンス図、アーキテクチャ図、データフロー図
Phase 3: Planning（計画）
    ↓ プロジェクト計画、リソース最適化
Phase 4: Implementation（実装）
    ↓ コード生成、フロントエンド、バックエンド、DB
Phase 5: Testing（テスト）
    ↓ 単体、統合、GUI、E2E、回帰テスト
Phase 6: Documentation（ドキュメント）
    ↓ ユーザーマニュアル、デモシナリオ
Phase 7: Deployment（デプロイ準備）
    ↓ インフラ構築、CI/CD設定
Phase 8: Platform Integration（認証課金統合）
    ↓ Cognito認証、Stripe課金（セットアップで選択時のみ）
```

## 入力パターン自動検出

| パターン | 例 | 処理 |
|---------|-----|------|
| WebサイトURL | `https://example.com` | スクレイピングで機能抽出 |
| GitHub Issue | `https://github.com/org/repo/issues/123` | Issue本文を要件として使用 |
| ローカルファイル | `./docs/requirements.md` | ファイル読み込み |
| GitHub上のファイル | `https://github.com/.../REQUIREMENTS.md` | GitHub APIで取得 |

## 出力

```
docs/
├── requirements/    # 要件定義書
├── diagrams/        # 設計図
├── tests/           # テスト設計書
├── manual/          # ユーザーマニュアル
└── demo/            # デモシナリオ

src/
├── frontend/        # フロントエンド
├── backend/         # バックエンド
└── shared/          # 共有コード

infra/
└── terraform/       # インフラ定義

tests/
├── unit/            # 単体テスト
├── integration/     # 統合テスト
└── e2e/             # E2Eテスト
```

## 実行例

```bash
# 競合サービスのクローンを生成
/generate-app https://competitor-app.com

# GitHub Issueの要件からアプリ生成
/generate-app https://github.com/myorg/myproject/issues/42

# ローカルの要件定義書から生成
/generate-app ./docs/PRODUCT_REQUIREMENTS.md

# 認証課金機能付きで生成
/generate-app https://example.com --with-platform --product-id=PROD_123
```

## 注意事項

- 全フェーズ完了まで時間がかかります（規模により30分〜数時間）
- 各フェーズで確認用URLが表示されます
- Phase 5のテストは必須実行（スキップ不可）
- `--with-platform` 使用時はProduct IDが必要

## 関連コマンド

- `/generate-requirements` - Phase 1のみ実行
- `/implement-app` - Phase 4のみ実行
- `/deploy-dev` - 開発環境デプロイ
- `/deploy-prod` - 本番環境デプロイ

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下の手順に従ってください：

### Step 0: GitHub Issue連携の初期化（入力がGitHub Issueの場合）

GitHub Issue URL が入力された場合、**必ず**以下を実行：

1. **Issue情報の取得**
   ```bash
   gh issue view <issue_number> --repo <owner/repo> --json number,title,body,labels
   ```

2. **SSOT Issueとしてセットアップ**
   - Issue本文に以下のマーカーがない場合は追加:
   ```markdown
   <!-- SSOT_ISSUE -->

   ## 📋 進捗状況

   | Phase | Status | Updated |
   |-------|--------|---------|
   | Phase 1: Requirements | 🔄 | - |
   | Phase 2: Design | ⏳ | - |
   | Phase 3: Planning | ⏳ | - |
   | Phase 4: Implementation | ⏳ | - |
   | Phase 5: Testing | ⏳ | - |
   | Phase 6: Documentation | ⏳ | - |
   | Phase 7: Deployment | ⏳ | - |
   | Phase 8: Platform | ⏳ | - |

   ## 📁 生成ドキュメント

   ### Phase 1: Requirements
   <!-- PHASE_1_DOCS -->

   ### Phase 2: Design
   <!-- PHASE_2_DOCS -->

   ### Phase 3: Planning
   <!-- PHASE_3_DOCS -->

   ### Phase 4: Implementation
   <!-- PHASE_4_DOCS -->

   ### Phase 5: Testing
   <!-- PHASE_5_DOCS -->

   ### Phase 6: Documentation
   <!-- PHASE_6_DOCS -->

   ### Phase 7: Deployment
   <!-- PHASE_7_DOCS -->

   ### Phase 8: Platform
   <!-- PHASE_8_DOCS -->

   <!-- LAST_UPDATED -->
   ```

3. **ラベル追加**
   ```bash
   gh issue edit <issue_number> --add-label "SSOT,🤖 automated"
   ```

### Step 1: 対話的セットアップ

`--with-platform`オプションが指定されていない場合、**必ず**以下の質問をユーザーに行ってください：

1. **認証機能の確認**（AskUserQuestionツールを使用）
   - 質問: 「認証機能を実装しますか？」
   - 選択肢:
     - 「はい - Cognito認証 + Stripe課金を統合（推奨）」
     - 「認証のみ - Cognito認証のみ統合」
     - 「いいえ - 認証機能なし」

2. **Product IDの確認**（認証機能を選択した場合）
   - 質問: 「CC-Auth Platform の Product ID を入力してください」
   - ※ユーザーがProduct IDを持っていない場合は、後から設定可能であることを伝える

3. **デプロイ環境の確認**
   - 質問: 「デプロイ先を選択してください」
   - 選択肢:
     - 「AWS（推奨）」
     - 「GCP」
     - 「Azure」
     - 「ローカルのみ（デプロイなし）」

### Step 2: フェーズ実行（GitHub Issue更新付き）

各フェーズ実行時、**必ず**以下を行う：

1. **フェーズ開始時**
   - Issue進捗テーブルのステータスを `🔄 進行中` に更新
   - Issueにコメントを追加:
     ```bash
     gh issue comment <issue_number> --body "## 🔄 Phase <N> 開始

     開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
     "
     ```

2. **ドキュメント生成時**
   - 生成したファイルをコミット
   - Issue本文の該当Phaseセクションにリンクを追加:
     ```markdown
     - [ファイル名](https://github.com/owner/repo/blob/branch/path/to/file) - 2026-01-03
     ```

3. **フェーズ完了時**
   - Issue進捗テーブルのステータスを `✅ 完了` に更新
   - Issueにコメントを追加:
     ```bash
     gh issue comment <issue_number> --body "## ✅ Phase <N> 完了

     完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

     ### 生成ファイル
     - path/to/file1
     - path/to/file2
     "
     ```

### Step 3: サブIssue作成（オプション）

大規模プロジェクトの場合、各フェーズ用のサブIssueを作成：

```bash
gh issue create --title "Phase 4: Implementation - #<親Issue番号>" \
  --body "親Issue: #<親Issue番号>

## タスク
- [ ] Frontend実装
- [ ] Backend実装
- [ ] DB設計" \
  --label "phase:implementation,🤖 automated"
```

### Step 4: 完了報告

全フェーズ完了後：

1. **Issue更新**
   ```bash
   gh issue comment <issue_number> --body "## 🎉 全フェーズ完了

   生成されたファイル: XX件
   実行時間: XX分

   ### 次のステップ
   1. \`npm test\` でテスト実行
   2. \`/deploy-dev\` で開発環境デプロイ
   "
   ```

2. **ラベル更新**
   ```bash
   gh issue edit <issue_number> --remove-label "📥 state:pending" --add-label "✅ state:completed"
   ```

3. **ユーザーへの報告**
   - 生成されたファイル一覧
   - 次のステップ（テスト実行、デプロイ方法など）
   - 認証機能を選択した場合: Platform SDKの設定手順
   - **GitHub Issue URL** を表示して更新を確認するよう促す
