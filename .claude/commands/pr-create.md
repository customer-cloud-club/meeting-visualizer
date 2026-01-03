---
description: Pull Request作成 - Draft PRを自動生成
---

# /pr-create - Pull Request作成

GitHub Pull Requestを作成します。Agent実行後のDraft PR作成に最適化されています。

## 使い方

```bash
# Issue番号から作成
/pr-create 889

# タイトルを指定
/pr-create 889 --title="Fix authentication bug"

# 本番PRとして作成（Draftにしない）
/pr-create 889 --ready

# ベースブランチを指定
/pr-create 889 --base=develop
```

## 機能

1. **自動PR作成**
   - Issueからタイトルとボディを自動生成
   - 適切なラベルを自動付与
   - レビュアーの自動割り当て

2. **Draft PR対応**
   - デフォルトでDraft PRとして作成
   - 人間レビュー前の安全措置

3. **テンプレート活用**
   - `.github/PULL_REQUEST_TEMPLATE.md` を自動適用
   - チェックリストの自動生成

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `issue_number` | Issue番号 | - |
| `--title` | PRタイトル | Issueタイトルから自動生成 |
| `--body` | PR説明文 | Issueから自動生成 |
| `--base` | ベースブランチ | `main` |
| `--head` | HEADブランチ | 現在のブランチ |
| `--draft` | Draft PRとして作成 | `true` |
| `--ready` | 本番PRとして作成 | `false` |
| `--assignee` | 担当者 | 現在のユーザー |
| `--reviewer` | レビュアー | チーム設定から自動 |
| `--label` | ラベル | Issueラベルを継承 |

## 実行例

### 例1: 基本的な使用

```bash
/pr-create 889
```

実行内容:
```bash
# 1. Issue情報取得
gh issue view 889 --json title,body,labels

# 2. PR作成
gh pr create \
  --title "[Issue #889] Fix authentication bug" \
  --body "..." \
  --base main \
  --head feat/issue-889 \
  --draft \
  --label "type:bug,status:review"

# 3. Issueにリンク
gh issue comment 889 --body "Draft PR created: #XXX"
```

出力:
```
Pull Request作成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: #889 - Fix authentication bug
ブランチ: feat/issue-889 → main
状態: Draft PR

✓ PR作成完了: #124
  URL: https://github.com/owner/repo/pull/124

✓ Issueにコメント追加
✓ ラベル付与: type:bug, status:review
✓ レビュアー割り当て: @reviewer-name

次のステップ:
1. gh pr view 124 でPRを確認
2. テストが完了したら "Ready for review" に変更
3. レビュー後にマージ
```

### 例2: カスタムタイトル・説明文

```bash
/pr-create 889 \
  --title="Fix: Authentication token expiration" \
  --body="認証トークンの有効期限切れバグを修正しました。\n\nChanges:\n- トークン更新ロジックの改善\n- エラーハンドリング追加"
```

### 例3: 本番PRとして作成

```bash
/pr-create 889 --ready
```

Draft PRではなく、即座にレビュー可能なPRとして作成されます。

### 例4: developブランチへのPR

```bash
/pr-create 889 --base=develop
```

mainではなくdevelopブランチに対するPRを作成します。

## PR本文テンプレート

自動生成されるPR本文の形式：

```markdown
## Issue

Closes #889

## Summary

[Issueの説明を自動挿入]

## Changes

- [変更内容1]
- [変更内容2]
- [変更内容3]

## Test Plan

- [ ] ユニットテスト実行
- [ ] 統合テスト実行
- [ ] 手動テスト実行

## Quality Checklist

- [ ] TypeScriptエラー: 0件
- [ ] ESLintエラー: 0件
- [ ] テストカバレッジ: 80%以上
- [ ] セキュリティスコア: 80点以上

## Screenshots

[必要に応じて追加]

---

Generated with CCAGI Agent
Co-Authored-By: Claude <noreply@anthropic.com>
```

## ラベル自動付与

Issueのラベルに基づいて、適切なPRラベルを自動付与：

| Issueラベル | PRラベル |
|------------|---------|
| `type:bug` | `type:bug` |
| `type:feature` | `type:feature` |
| `type:refactor` | `type:refactor` |
| `緊急度-高` | `priority:high` |
| `緊急度-即時` | `priority:urgent` |
| `規模-小` | `size:small` |
| `規模-大` | `size:large` |

追加で自動付与：
- `status:review` - レビュー待ち
- `automated` - Agent作成
- `draft` - Draft PR（デフォルト）

## レビュアー自動割り当て

`.ccagi.yml` の設定に基づいてレビュアーを自動割り当て：

```yaml
pr:
  reviewers:
    default:
      - reviewer1
      - reviewer2
    bug:
      - bug-specialist
    feature:
      - feature-lead
```

## Draft PR → Ready for Review

Draft PRを本番PRに変更：

```bash
# GitHub CLI
gh pr ready 124

# Web UI
PRページで "Ready for review" をクリック
```

## トラブルシューティング

### PRが作成できない

```
Error: No commits between main...feat/issue-889

原因: ブランチに変更がない

解決策:
1. 変更をコミット: git commit -am "..."
2. プッシュ: git push origin feat/issue-889
3. 再実行: /pr-create 889
```

### Issueが見つからない

```
Error: Issue #999 not found

解決策:
1. Issue番号を確認: gh issue list
2. Issueを作成: /create-issue --title="..." --body="..."
```

### ブランチがプッシュされていない

```
Error: Branch feat/issue-889 not found on remote

解決策:
# ブランチをプッシュ
git push -u origin feat/issue-889

# 再実行
/pr-create 889
```

### レビュアーが割り当てられない

```
Warning: Could not assign reviewers

原因: 権限不足、またはレビュアーが存在しない

解決策:
# 手動でレビュアーを割り当て
gh pr edit 124 --add-reviewer username
```

## ベストプラクティス

### Agent実行後の標準フロー

```bash
# 1. コード生成
/agent-run --issue 889

# 2. 品質チェック
npm run typecheck
npm test

# 3. Draft PR作成
/pr-create 889

# 4. 人間レビュー
# ... レビュー完了 ...

# 5. Ready for review
gh pr ready 124

# 6. マージ
gh pr merge 124 --squash
```

### 複数コミットの場合

```bash
# コミット履歴を整理
git rebase -i main

# PRを作成
/pr-create 889
```

### テンプレートのカスタマイズ

`.github/PULL_REQUEST_TEMPLATE.md` を編集：

```markdown
## Summary
<!-- PRの概要を記載 -->

## Changes
<!-- 変更内容をリストアップ -->

## Test Plan
<!-- テスト計画を記載 -->
```

## 関連コマンド

- `/pr-list` - PR一覧表示
- `/worktree-create <issue>` - worktree作成
- `/agent-run --issue <issue>` - Agent実行
- `gh pr view <number>` - PR詳細表示
- `gh pr merge <number>` - PRマージ

## GitHub CLI（gh）統合

このコマンドは内部的に `gh` コマンドを使用します。

必須設定:
```bash
# GitHub認証
gh auth login

# デフォルトリポジトリ設定
gh repo set-default owner/repo
```

---

**ヒント**: Draft PRを活用することで、レビュー前の作業状態を安全に共有できます。
