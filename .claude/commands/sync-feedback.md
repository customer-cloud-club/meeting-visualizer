---
description: SSOT Issueからフィードバックを同期し、適切なPhaseを自動実行
allowed-tools: Bash, Read, Write, Grep, Glob, Task, Edit, Skill
---

# Sync Feedback Command

SSOT Issueから未適用フィードバックを取得し、**適切なPhaseから自動実行**します。

## 🚨 必須実行チェックリスト（スキップ不可）

> **このセクションの全項目を実行しなければ、コマンドは完了とみなされません。**

| # | 必須アクション | 実行方法 |
|---|---------------|----------|
| 1 | フィードバック取得 | `gh api` でSSOT Issueからpending状態のFBを取得 |
| 2 | サブIssue起票 | 各Phase用のGitHub Issueを`gh issue create`で作成 |
| 3 | Phase 4実行 | `Skill` ツールで `/implement-app` を呼び出し |
| 4 | Phase 5実行 | `Skill` ツールで `/test` を呼び出し（**必須**） |
| 5 | FBを適用済みに | `gh api -X PATCH` でステータスを `✅ applied` に更新 |
| 6 | 完了報告 | SSOT Issueにサマリーコメントを追加 |

**⚠️ 警告**: Phase 5（テスト）は**絶対にスキップ禁止**です。

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

## ⚠️ 重要: コマンド呼び出しは必ずSkill経由で実行

各Phaseの実行は、**必ず`Skill`ツールを使用してコマンドを呼び出してください**。

```
❌ NG: 直接Terraformを実行
❌ NG: 直接npm testを実行
❌ NG: 直接コードを書く

✅ OK: Skill tool で /implement-app を呼び出す
✅ OK: Skill tool で /test を呼び出す
✅ OK: Skill tool で /deploy を呼び出す
```

**理由**: 各コマンド内にはSWMLワークフロー指示、Issue起票ロジック、品質チェックが含まれています。直接実行するとこれらがスキップされます。

## 使用方法

```bash
# フィードバック同期 + 自動実行（デフォルト）
/sync-feedback

# 一覧表示のみ（自動実行しない）
/sync-feedback --list

# 特定フェーズのフィードバックのみ表示
/sync-feedback --phase 4

# フィードバックを適用済みにマーク
/sync-feedback --apply FB-XXXXX

# 全フェーズ強制実行
/sync-feedback --full
```

## 実行手順

### Step 1: SSOT Issue番号を取得

```bash
# .ccagi.yml からSSOT Issue番号を取得
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | head -1 | awk '{print $2}')

if [ -z "$SSOT_ISSUE" ]; then
  echo "❌ SSOT Issue が設定されていません"
  echo "→ /create-ssot-issue でSSOT Issueを作成してください"
  exit 1
fi

echo "📋 SSOT Issue: #${SSOT_ISSUE}"
```

### Step 2: フィードバックコメントを取得

```bash
# Issueコメントからフィードバックを抽出
gh api repos/{owner}/{repo}/issues/${SSOT_ISSUE}/comments \
  --jq '.[] | select(.body | contains("FEEDBACK_ID")) | {id: .id, body: .body}'
```

### Step 3: フィードバック一覧を表示

```
📥 未適用フィードバック一覧

| ID | Phase | 種別 | 優先度 | 内容 |
|----|-------|------|--------|------|
| FB-205 | 1 | feature | 🔴 high | SSOT自動作成機能 |
| FB-203 | all | feature | 🔴 high | フィードバック自動取り込み |
| FB-202 | 5,7 | feature | 🔴 high | デプロイ後フローテスト |
| FB-201 | 5 | bug | 🔴 high | GUI/E2Eテスト未実行 |
| FB-200 | all | feature | 🔴 high | 要件定義書総点検 |
| FB-197 | 5,7 | feature | 🟡 medium | デプロイ後テスト自動実行 |

合計: 6件 (pending)
```

### Step 4: フェーズフィルタ（オプション）

引数に `--phase <N>` が含まれる場合：

```bash
PHASE=$(echo "$ARGUMENTS" | grep -oE '\-\-phase[[:space:]]+[0-9]+' | awk '{print $2}')

if [ -n "$PHASE" ]; then
  echo "📋 Phase ${PHASE} のフィードバックのみ表示"
  # フェーズでフィルタ
fi
```

### Step 5: フィードバック適用マーク（オプション）

引数に `--apply <ID>` が含まれる場合：

```bash
APPLY_ID=$(echo "$ARGUMENTS" | grep -oE '\-\-apply[[:space:]]+FB-[A-Z0-9]+' | awk '{print $2}')

if [ -n "$APPLY_ID" ]; then
  # コメントを検索してステータスを更新
  COMMENT_ID=$(gh api repos/{owner}/{repo}/issues/${SSOT_ISSUE}/comments \
    --jq ".[] | select(.body | contains(\"${APPLY_ID}\")) | .id")

  if [ -n "$COMMENT_ID" ]; then
    # コメント本文を取得して更新
    CURRENT_BODY=$(gh api repos/{owner}/{repo}/issues/comments/${COMMENT_ID} --jq '.body')
    UPDATED_BODY=$(echo "$CURRENT_BODY" | sed 's/🟡 pending/✅ applied/g')

    gh api repos/{owner}/{repo}/issues/comments/${COMMENT_ID} \
      -X PATCH \
      -f body="$UPDATED_BODY"

    echo "✅ フィードバック ${APPLY_ID} を適用済みにマークしました"
  else
    echo "❌ フィードバック ${APPLY_ID} が見つかりません"
  fi
fi
```

## Step 6: 自動実行フロー（デフォルト動作）

`--list`オプションがない場合、未適用フィードバックに基づいて自動実行します。

### ⚠️ 重要: テスト実行は必須

**どのPhaseを実行する場合でも、Phase 5（テスト）は必ず実行してください。**

テストをスキップしてデプロイを行うことは禁止されています。

### フィードバック種別からPhaseを判定

| 種別 | 対象Phase | 実行コマンド |
|------|-----------|--------------|
| architecture | 2, 3, **5** | `/generate-sequence-diagram`, `/plan-project`, **`/test`** |
| feature | 3, 4, **5** | `/plan-project`, `/implement-app`, **`/test`** |
| bug | 4, **5** | `/implement-app`, **`/test`** |
| performance | 4, **5** | `/implement-app`, **`/test`** |
| design | 2, **5** | `/generate-sequence-diagram`, **`/test`** |
| docs | 6 | `/docs-generate` |

### 自動実行ロジック

**⚠️ 重要: 各Phaseは必ずSkillツールでコマンドを呼び出すこと**

```
📥 フィードバック同期中...

⚠️ 未適用フィードバック: 2件

1. FB-1767427424 (performance) → Phase 4, 5
2. FB-1767413781 (architecture) → Phase 2, 3, 4

📊 影響Phase分析:
- Phase 2: 設計更新が必要
- Phase 3: 計画更新が必要
- Phase 4: 実装が必要
- Phase 5: テストが必要

🔧 Step 1: サブIssue起票（必須）
   各Phaseごとにサブissueを起票:
   → gh issue create --title "Phase 2: 設計更新 - FB-xxx" ...
   → gh issue create --title "Phase 4: 実装 - FB-xxx" ...
   → gh issue create --title "Phase 5: テスト - FB-xxx" ...
   ✅ サブIssue #XXX, #YYY, #ZZZ を作成

🚀 Step 2: 自動実行開始（Skill経由で各コマンドを呼び出し）

θ₁ Phase 2: 設計更新
   → Skill tool: /generate-sequence-diagram
   ✅ シーケンス図を更新
   ✅ サブIssue #XXX をクローズ

θ₂ Phase 3: 計画更新
   → Skill tool: /plan-project
   ✅ 実装計画を更新

θ₃ Phase 4: 実装
   → Skill tool: /implement-app
   ✅ コード生成完了
   ✅ サブIssue #YYY をクローズ

θ₄ Phase 5: テスト
   → Skill tool: /test
   ✅ 単体テスト: PASS
   ✅ 結合テスト: PASS
   ✅ E2Eテスト: PASS
   ✅ サブIssue #ZZZ をクローズ

θ₅ Phase 6: ドキュメント更新
   → Skill tool: /docs-generate
   ✅ ドキュメント生成完了

θ₆ Phase 7: デプロイ
   → Skill tool: /deploy-dev
   ✅ 開発環境デプロイ完了

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ フィードバック対応完了

適用済みフィードバック:
- FB-1767427424 → ✅ applied
- FB-1767413781 → ✅ applied
```

### Step 6.1: サブIssue起票（必須）

**各Phaseを実行する前に、必ずサブIssueを起票してください。**

```bash
# SSOT Issue番号を取得
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | head -1 | awk '{print $2}')

# 各Phaseごとにサブissueを起票
for PHASE in 2 3 4 5 7; do
  PHASE_ISSUE=$(gh issue create \
    --title "Phase ${PHASE}: $(getPhaseTitle $PHASE) - FB-${FEEDBACK_ID}" \
    --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## Phase ${PHASE}: $(getPhaseTitle $PHASE)

フィードバック対応のためのPhase ${PHASE} 作業。

## タスク

- [ ] 作業実施
- [ ] 品質チェック
- [ ] 完了確認

---
🤖 Generated by CCAGI SDK /sync-feedback
EOF
)" \
    --label "phase:$(getPhaseLabel $PHASE)" | grep -oE '[0-9]+$')

  echo "✅ Phase ${PHASE} Issue #${PHASE_ISSUE} を作成"
done
```

### Step 6.2: Skill経由でコマンド実行（必須）

**各Phaseコマンドは必ずSkillツールで呼び出してください。**

```
# Phase 2: 設計
Skill tool を使用: skill="generate-sequence-diagram"

# Phase 3: 計画
Skill tool を使用: skill="plan-project"

# Phase 4: 実装
Skill tool を使用: skill="implement-app"

# Phase 5: テスト
Skill tool を使用: skill="test"

# Phase 6: ドキュメント
Skill tool を使用: skill="docs-generate"

# Phase 7: デプロイ
Skill tool を使用: skill="deploy-dev"
```

### Step 6.3: サブIssueクローズ

各Phase完了後、サブIssueをクローズ：

```bash
gh issue close ${PHASE_ISSUE} --comment "✅ Phase ${PHASE} 完了"
```

### 実行判定ルール

```javascript
// Phase判定ロジック - テスト(5)は全種別で必須
const phaseMapping = {
  architecture: [2, 3, 4, 5],  // 設計→計画→実装→テスト
  feature: [3, 4, 5],          // 計画→実装→テスト
  bug: [4, 5],                 // 実装→テスト
  performance: [4, 5],         // 実装→テスト
  design: [2, 5],              // 設計→テスト
  docs: [6],                   // ドキュメントのみ（テスト不要）
};

// 最小Phaseから開始
const startPhase = Math.min(...affectedPhases);

// ⚠️ 重要: docs以外は必ずテスト(5)を含める
if (!affectedPhases.includes(5) && !feedbackTypes.includes('docs')) {
  affectedPhases.push(5);
}

// デプロイ前にテストが実行されていることを確認
if (affectedPhases.includes(7) && !affectedPhases.includes(5)) {
  throw new Error('テスト(Phase 5)なしでデプロイ(Phase 7)は実行できません');
}
```

### ⚠️ テスト実行の強制チェック

**デプロイ(Phase 7)を実行する前に、以下を必ず確認：**

1. テスト(Phase 5)が実行されていること
2. テストが全てPASSしていること
3. 型チェックがエラーなしで完了していること

```bash
# デプロイ前チェック（必須）
npm run typecheck || { echo "❌ 型チェック失敗"; exit 1; }
npm test || { echo "❌ テスト失敗"; exit 1; }

# テスト成功後のみデプロイを実行
echo "✅ テストPASS - デプロイを開始します"
```

### コマンド実行順序

```
Phase 2: /generate-sequence-diagram, /generate-architecture-diagram
Phase 3: /plan-project
Phase 4: /implement-app
Phase 5: /test (単体→結合→E2E)
Phase 6: /docs-generate
Phase 7: /deploy-dev
```

## Step 7: フィードバック適用マーク

自動実行完了後、フィードバックを自動的に`applied`にマーク：

```bash
for FB_ID in $APPLIED_FEEDBACKS; do
  COMMENT_ID=$(gh api repos/{owner}/{repo}/issues/${SSOT_ISSUE}/comments \
    --jq ".[] | select(.body | contains(\"${FB_ID}\")) | .id")

  if [ -n "$COMMENT_ID" ]; then
    CURRENT_BODY=$(gh api repos/{owner}/{repo}/issues/comments/${COMMENT_ID} --jq '.body')
    UPDATED_BODY=$(echo "$CURRENT_BODY" | sed 's/🟡 pending/✅ applied/g')

    gh api repos/{owner}/{repo}/issues/comments/${COMMENT_ID} \
      -X PATCH -f body="$UPDATED_BODY"

    echo "✅ ${FB_ID} を適用済みにマーク"
  fi
done
```

## Step 8: 完了報告（SSOT Issueにコメント）

```bash
gh issue comment ${SSOT_ISSUE} --body "$(cat <<EOF
## 🔄 Sync Feedback 実行完了

### 適用フィードバック
$(for FB in $APPLIED_FEEDBACKS; do echo "- ${FB} ✅"; done)

### 実行Phase
- Phase 2: 設計更新 ✅
- Phase 3: 計画更新 ✅
- Phase 4: 実装 ✅
- Phase 5: テスト ✅
- Phase 6: ドキュメント ✅
- Phase 7: デプロイ ✅

### 結果
- 単体テスト: PASS
- 結合テスト: PASS
- E2Eテスト: PASS
- デプロイ: 成功

---
🤖 Generated by CCAGI SDK /sync-feedback
EOF
)"
```

## 各コマンドでの自動取り込み

各フェーズコマンド（`/generate-sequence-diagram`, `/implement-app` など）は実行前に以下を行います：

```bash
# フィードバック自動取り込み（各コマンド内で実行）
echo "📥 フィードバック確認中..."

SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | head -1 | awk '{print $2}')

if [ -n "$SSOT_ISSUE" ]; then
  # 未適用フィードバックを取得
  PENDING=$(gh api repos/{owner}/{repo}/issues/${SSOT_ISSUE}/comments \
    --jq '[.[] | select(.body | contains("pending"))] | length')

  if [ "$PENDING" -gt 0 ]; then
    echo "⚠️ 未適用フィードバック: ${PENDING}件"
    echo "→ 以下のフィードバックを考慮して実行します"
    # フィードバック内容を表示
  fi
fi
```

## 関連コマンド

- [/user-feedback](./user-feedback.md) - フィードバック記録
- [/create-ssot-issue](./create-ssot-issue.md) - SSOT Issue作成
- [/ccagi-auto](./ccagi-auto.md) - 全自動モード

---
🤖 CCAGI SDK - Feedback Synchronization with Auto-Execution
