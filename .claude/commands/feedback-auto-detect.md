---
description: ユーザーの会話から「こうしてほしい」「これが足りない」などの要望を自動検出し、適切な場所に記録する。専門知識不要。Claude専用（/user-feedbackコマンドはユーザーが直接利用可能）。
allowed-tools: Bash, Read, Write, Grep, Glob, Edit
---

# Feedback Auto-Detect (Claude専用)

このスキルはClaudeが会話中に自動でユーザーフィードバックを検出するために使用します。
ユーザーが直接実行する場合は `/user-feedback` を使用してください。

## 検出パターン

以下のパターンを検出したらフィードバックとして記録：

### 高優先度（即座に記録）
- 「動かない」「エラーが出る」「クラッシュする」
- 「セキュリティ」「脆弱性」「緊急」「至急」

### 中優先度（記録推奨）
- 「してほしい」「したい」「お願い」
- 「追加して」「変更して」「修正して」
- 「改善」「対応」

### 低優先度（任意）
- 「できれば」「余裕があれば」「ついでに」

## 自動検出時の動作

1. 会話からフィードバックパターンを検出
2. 種別・優先度を自動判定
3. `.ai/feedback/` に記録
4. SSOT Issue（設定されていれば）にコメント追加
5. ユーザーに確認メッセージを表示

## 検出後の処理

```bash
# SSOT Issue番号を取得
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | head -1 | awk '{print $2}')

if [ -n "$SSOT_ISSUE" ]; then
  # フィードバックをIssueコメントに追加
  gh issue comment ${SSOT_ISSUE} --body "$(cat <<EOF
## 💬 Auto-Detected Feedback

| 項目 | 内容 |
|------|------|
| **ID** | FB-$(date +%s | tail -c 6) |
| **種別** | ${TYPE} |
| **優先度** | ${PRIORITY} |
| **ステータス** | 🟡 pending |

### 内容

${CONTENT}

---
<!-- FEEDBACK_ID:FB-$(date +%s | tail -c 6) -->
<!-- AUTO_DETECTED:true -->
EOF
)"
fi
```

## 確認メッセージ

```
📝 フィードバックを検出・記録しました

内容: ${CONTENT}
種別: ${TYPE}
優先度: ${PRIORITY}

→ SSOT Issue #${SSOT_ISSUE} に記録済み
→ 次回のコマンド実行時に自動参照されます
```

---
🤖 CCAGI SDK - Automatic Feedback Detection
