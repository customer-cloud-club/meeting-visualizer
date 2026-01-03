---
description: SSOT Issueからフィードバックを同期し、適切なPhaseを自動実行
allowed-tools: Bash, Read, Write, Grep, Glob, Task, Edit
---

# Sync Feedback Command

SSOT Issueから未適用フィードバックを取得し、**適切なPhaseから自動実行**します。

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

### フィードバック種別からPhaseを判定

| 種別 | 対象Phase | 実行コマンド |
|------|-----------|--------------|
| architecture | 2, 3 | `/generate-sequence-diagram`, `/plan-project` |
| feature | 3, 4 | `/plan-project`, `/implement-app` |
| bug | 4, 5 | `/implement-app`, `/test` |
| performance | 4, 5 | `/implement-app`, `/test` |
| design | 2 | `/generate-sequence-diagram` |
| docs | 6 | `/docs-generate` |

### 自動実行ロジック

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

🚀 自動実行開始（最小Phaseから順次実行）

θ₁ Phase 2: 設計更新
   → /generate-sequence-diagram
   ✅ シーケンス図を更新

θ₂ Phase 3: 計画更新
   → /plan-project
   ✅ 実装計画を更新

θ₃ Phase 4: 実装
   → /implement-app
   ✅ コード生成完了

θ₄ Phase 5: テスト
   → /test
   ✅ 単体テスト: PASS
   ✅ 結合テスト: PASS
   ✅ E2Eテスト: PASS

θ₅ Phase 6: ドキュメント更新
   → /docs-generate
   ✅ ドキュメント生成完了

θ₆ Phase 7: デプロイ
   → /deploy-dev
   ✅ 開発環境デプロイ完了

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ フィードバック対応完了

適用済みフィードバック:
- FB-1767427424 → ✅ applied
- FB-1767413781 → ✅ applied
```

### 実行判定ルール

```javascript
// Phase判定ロジック
const phaseMapping = {
  architecture: [2, 3, 4],  // 設計→計画→実装
  feature: [3, 4, 5],       // 計画→実装→テスト
  bug: [4, 5],              // 実装→テスト
  performance: [4, 5],      // 実装→テスト
  design: [2],              // 設計のみ
  docs: [6],                // ドキュメントのみ
};

// 最小Phaseから開始
const startPhase = Math.min(...affectedPhases);

// Phase 4以降は必ずテスト(5)とデプロイ(7)を含める
if (startPhase <= 4) {
  affectedPhases.push(5, 7);
}
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
