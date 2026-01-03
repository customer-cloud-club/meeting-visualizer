---
description: URL/ドキュメントから要件を自動生成（CMD-001）
---

# Generate Requirements Command

CCAGI SDK Phase 1 コマンド (CMD-001)

## ⚠️ SWMLワークフロー指示（必須）

このコマンドを実行する際、**必ず**以下のワークフローに従ってください：

```
メモリ使用量は、最大92%
そのために効率よく並列処理
必ず、必ず、必ず、miyabi のワークフローシステムに従って、タスク分解して計画、プランニングを行ってください。
このマスターIssue、このマスタータスクをタスク分解、分解バラバラにしちゃって、アサインできる状態でサブIssuesに分割してください。
分割したら、目的を達成するまで、作業をひたすら続けてください

完了したIssueはクローズしてください
```

**SWMLフロー**: θ₁ Understand → θ₂ Generate → θ₃ Allocate → θ₄ Execute → θ₅ Integrate → θ₆ Learn

---

ターゲットURL/ドキュメントを分析し、構造化された要件定義を自動生成します。

## 使用方法

```bash
/generate-requirements <url>
```

## パラメータ

- `url` (必須): 分析対象のURL
  - Webページ
  - ドキュメントURL
  - API仕様書URL

## 実行フロー

```mermaid
graph TD
    A[/generate-requirements URL] --> B[θ₁ URLコンテンツ取得]
    B --> C[θ₂ 要件抽出・分解]
    C --> D[θ₃ 要件カテゴリ分類]
    D --> E[θ₄ Markdown生成]
    E --> F[θ₅ 整合性検証]
    F --> G[θ₆ 出力・学習]
    G --> H[${REQUIREMENTS}/*.md]
```

## 出力先

```
docs/requirements/
├── functional-requirements.md      # 機能要件
├── non-functional-requirements.md  # 非機能要件
├── technical-constraints.md        # 技術制約
├── user-stories.md                 # ユーザーストーリー
└── acceptance-criteria.md          # 受入基準
```

## 実行例

### 基本的な使用

```bash
/generate-requirements https://example.com/product-spec
```

**期待される出力**:

```
🔍 CCAGI Requirements Generator (CMD-001)

Phase 1: Requirements Gathering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ URLコンテンツ取得完了
   📄 ページ分析: 15セクション検出

θ₂ Generating...
   ✅ 要件候補 42件抽出
   🔄 カテゴリ分類中...

θ₃ Allocating...
   ✅ 機能要件: 28件
   ✅ 非機能要件: 8件
   ✅ 技術制約: 6件

θ₄ Executing...
   📝 functional-requirements.md 生成
   📝 non-functional-requirements.md 生成
   📝 technical-constraints.md 生成
   📝 user-stories.md 生成
   📝 acceptance-criteria.md 生成

θ₅ Integrating...
   ✅ 整合性検証: PASS
   ✅ カバレッジ: 95%

θ₆ Learning...
   📊 抽出パターン学習完了

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Requirements Generated Successfully

出力先: docs/requirements/
ファイル数: 5
総要件数: 42
実行時間: 45s

次のステップ:
  /add-requirements [追加要件]  # 追加要件を追記
  /generate-diagram sequence    # シーケンス図生成
```

## 出力ファイル形式

### functional-requirements.md

```markdown
# 機能要件

## FR-001: ユーザー認証
- **優先度**: High
- **説明**: ユーザーはメールアドレスとパスワードでログインできる
- **受入基準**:
  - [ ] ログインフォームが表示される
  - [ ] 認証成功時にダッシュボードへリダイレクト
  - [ ] 認証失敗時にエラーメッセージ表示

## FR-002: プロフィール管理
...
```

## 依存関係

このコマンドは依存関係がないため、最初に実行できます。

**依存コマンド** (このコマンドに依存):
- CMD-002: /add-requirements
- CMD-003: /generate-diagram sequence
- CMD-004: /generate-diagram architecture
- CMD-005: /generate-diagram dataflow

## SWML Workflow統合

このコマンドは`SWML_WORKFLOW`と`THOROUGH_ANALYSIS`インストラクションに従って実行されます。

```yaml
instructions:
  - SWML_WORKFLOW      # θ₁-θ₆処理フロー
  - THOROUGH_ANALYSIS  # 詳細分析モード
```

## 設定

### .ccagi.yml

```yaml
commands:
  generate-requirements:
    output_dir: docs/requirements
    analysis_depth: thorough
    language: ja
    include:
      - functional
      - non-functional
      - constraints
      - user-stories
      - acceptance-criteria
```

## トラブルシューティング

### Q1: URLにアクセスできない

```
Error: Unable to fetch URL content

対処法:
1. URLが有効か確認
2. 認証が必要なページの場合はトークンを設定
3. プロキシ設定を確認
```

### Q2: 要件が少なすぎる

```
対処法:
1. 複数のURLを指定して情報を補完
2. /add-requirements で手動追加
3. analysis_depth: deep に設定変更
```

## 関連コマンド

- [/add-requirements](./add-requirements.md) - 追加要件の追記 (CMD-002)
- [/generate-diagram](./generate-diagram.md) - 設計図生成 (CMD-003~005)

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### Step 1: SSOT Issue作成

要件生成完了後、**必ず**SSOT Issueを作成：

```bash
SSOT_ISSUE=$(gh issue create \
  --title "[SSOT] ${PROJECT_NAME} 要件定義・進捗管理" \
  --body "$(cat <<'EOF'
# 📋 SSOT Document Registry

このIssueはプロジェクトの全ドキュメントへのリンクと進捗を管理します。

## 📊 進捗状況

| Phase | Status | Issue | Updated |
|-------|--------|-------|---------|
| Phase 1: Requirements | 🔄 | #PHASE1 | $(date '+%Y-%m-%d') |
| Phase 2: Design | ⏳ | - | - |
| Phase 3: Planning | ⏳ | - | - |
| Phase 4: Implementation | ⏳ | - | - |
| Phase 5: Testing | ⏳ | - | - |
| Phase 6: Documentation | ⏳ | - | - |
| Phase 7: Deployment | ⏳ | - | - |
| Phase 8: Platform | ⏳ | - | - |

## 📁 フェーズ別作業Issue

<!-- PHASE_ISSUES -->

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

---
<!-- LAST_UPDATED -->
EOF
)" \
  --label "SSOT,🤖 automated" | grep -oE '[0-9]+$')

echo "SSOT Issue #${SSOT_ISSUE} を作成しました"
```

### Step 2: Phase 1 作業用Issue作成

**必ず**Phase 1の作業用Issueを作成：

```bash
PHASE1_ISSUE=$(gh issue create \
  --title "📋 Phase 1: 要件定義 - #${SSOT_ISSUE}" \
  --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## 📋 Phase 1: Requirements

要件定義フェーズの作業を管理します。

## タスク

- [x] URLコンテンツ分析
- [x] 機能要件抽出
- [x] 非機能要件抽出
- [x] 技術制約特定
- [x] ユーザーストーリー作成
- [x] 受入基準定義

## 生成ドキュメント

- [functional-requirements.md](./docs/requirements/functional-requirements.md)
- [non-functional-requirements.md](./docs/requirements/non-functional-requirements.md)
- [technical-constraints.md](./docs/requirements/technical-constraints.md)
- [user-stories.md](./docs/requirements/user-stories.md)
- [acceptance-criteria.md](./docs/requirements/acceptance-criteria.md)

## 次のフェーズ

Phase 2: Design → シーケンス図・アーキテクチャ図・データフロー図

---
🤖 Generated by CCAGI SDK
EOF
)" \
  --label "phase:requirements,🤖 automated" | grep -oE '[0-9]+$')

# Phase 1 Issueをクローズ
gh issue close ${PHASE1_ISSUE} --comment "✅ Phase 1 完了 - 要件定義が完了しました"

echo "Phase 1 Issue #${PHASE1_ISSUE} を作成・完了しました"
```

### Step 3: Issue番号の記録

作成したIssue番号を `.ccagi.yml` に記録：

```yaml
# .ccagi.yml に追記
ssot:
  issue_number: <SSOT Issue番号>
  created_at: <作成日時>
phase_issues:
  phase1: <Phase 1 Issue番号>
```

### Step 4: SSOT Issue更新

Phase 1 Issue番号をSSOT Issueに反映：

```bash
# SSOT Issueの進捗テーブルを更新
gh issue comment ${SSOT_ISSUE} --body "## ✅ Phase 1: Requirements 完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### 作成されたIssue
- Phase 1 Issue: #${PHASE1_ISSUE}

### 生成ドキュメント
- [functional-requirements.md](./docs/requirements/functional-requirements.md)
- [non-functional-requirements.md](./docs/requirements/non-functional-requirements.md)
- [technical-constraints.md](./docs/requirements/technical-constraints.md)
- [user-stories.md](./docs/requirements/user-stories.md)
- [acceptance-criteria.md](./docs/requirements/acceptance-criteria.md)

### 次のステップ
\`/generate-sequence-diagram\` を実行してPhase 2を開始
"
```

### Step 5: 完了報告

ユーザーに以下を報告：
- 生成されたドキュメント一覧
- **SSOT Issue URL** を表示
- 次のステップ

---

🤖 CCAGI SDK v6.21.4 - Phase 1: Requirements (CMD-001)
