---
description: "ユーザーの会話から「こうしてほしい」「これが足りない」などの要望を自動検出し、適切な場所に記録する。専門知識不要。"
allowed-tools: Bash, Read, Write, Grep, Glob, Edit
---

# User Feedback - フィードバック記録

ユーザーからのフィードバックを記録・整理します。

## 使い方

```
/user-feedback <フィードバック内容>
```

## 例

```
/user-feedback CI/CDはCodePipelineを利用すること
/user-feedback ボタンの色を青に変更して
/user-feedback エラーが出て動かない
```

## 処理内容

1. **入力解析**: フィードバック内容を解析
2. **緊急度判定**:
   - 高: 「動かない」「エラー」「困っている」
   - 中: 通常のお願い
   - 低: 「できれば」「余裕があれば」
3. **分類判定**:
   - design: 色、サイズ、見た目、レイアウト
   - usability: ボタン、画面、操作
   - feature: 機能、〜したい、〜できるように
   - bug: 動かない、おかしい、バグ
   - docs: 分かりにくい、説明、ヘルプ
   - architecture: CI/CD、インフラ、設計変更
4. **記録**: `.ai/feedback/` に記録
5. **確認**: ユーザーに記録完了を通知

## 実行手順

引数 `$ARGUMENTS` にフィードバック内容が渡されます。

### Step 1: フィードバック解析

フィードバック内容: `$ARGUMENTS`

緊急度と分類を判定してください。

### Step 2: 記録ファイル作成

`.ai/feedback/` ディレクトリに記録します（なければ作成）。

ファイル名: `YYYY-MM-DD-HH-MM-feedback.md`

```markdown
# フィードバック

- **日時**: YYYY-MM-DD HH:MM
- **内容**: <フィードバック内容>
- **緊急度**: 高/中/低
- **分類**: <分類>
- **状態**: 未対応

## 対応メモ

（対応時に記載）
```

### Step 3: 確認メッセージ

記録完了後、以下の形式で報告:

```
📝 フィードバックを記録しました

内容: <内容の要約>
緊急度: 🔴高 / 🟡中 / 🟢低
分類: <分類>

→ 現在の作業に反映します
```

### Step 4: SSOT Issueへのコメント追加【必須・スキップ不可】

> ⚠️ **重要**: このステップは**スキップ不可**です。
> SSOT Issueへの記載が完了するまで、このコマンドは「完了」とみなされません。
> フックによる自動同期もありますが、確実性のため手動でも実行してください。

`.ccagi.yml` にSSOT Issue番号がある場合、**必ず**フィードバックをIssueコメントとして記録：

```bash
# SSOT Issue番号を取得
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | awk '{print $2}')

# SSOT未設定の場合は警告して作成を促す
if [ -z "$SSOT_ISSUE" ]; then
  echo "⚠️ SSOT Issue が未設定です"
  echo "→ /create-ssot-issue を実行してSSOT Issueを作成してください"
  echo "→ または .ccagi.yml に ssot.issue_number を設定してください"
  # ローカル記録は完了しているが、SSOT記載は未完了
  exit 1
fi

# SSOT Issueにコメント追加
gh issue comment ${SSOT_ISSUE} --body "$(cat <<EOF
## 💬 User Feedback

| 項目 | 内容 |
|------|------|
| **ID** | FB-$(date +%s) |
| **種別** | <分類> |
| **緊急度** | <緊急度> |
| **ステータス** | 🟡 pending |

### フィードバック内容

<フィードバック内容>

---
<!-- FEEDBACK_ID:FB-$(date +%s) -->
EOF
)"

# 成功確認
if [ $? -eq 0 ]; then
  echo "✅ フィードバックをSSOT Issue #${SSOT_ISSUE} に記録しました"
else
  echo "❌ SSOT Issueへの記載に失敗しました"
  echo "→ 手動で https://github.com/customer-cloud-club/ccagi-system/issues/${SSOT_ISSUE} に記載してください"
  exit 1
fi
```

### Step 4.5: SSOT記載確認チェック

フィードバックファイルに記載完了マークを追加：

```bash
# フィードバックファイルにSSOT記載済みを記録
FEEDBACK_FILE=".ai/feedback/YYYY-MM-DD-HH-MM-feedback.md"
echo "" >> $FEEDBACK_FILE
echo "---" >> $FEEDBACK_FILE
echo "ssot_synced: true" >> $FEEDBACK_FILE
echo "ssot_issue: ${SSOT_ISSUE}" >> $FEEDBACK_FILE
echo "synced_at: $(date '+%Y-%m-%d %H:%M:%S')" >> $FEEDBACK_FILE
```

### Step 5: 現在の作業への反映

フィードバックの内容を考慮して、現在進行中のタスクがあれば調整を提案してください。

### Step 6: 完了報告

ユーザーに以下を報告：
- フィードバック記録の確認
- **SSOT Issue URL**（記録した場合）
- 対応予定・優先度
