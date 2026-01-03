---
description: Pull Request一覧表示 - PR状態を確認
---

# /pr-list - Pull Request一覧表示

GitHub Pull Requestの一覧を表示します。

## 使い方

```bash
# 全PR一覧
/pr-list

# Draft PRのみ
/pr-list --draft

# Open PRのみ
/pr-list --state=open

# 特定ブランチへのPR
/pr-list --base=main

# 自分が作成したPR
/pr-list --author=@me
```

## 機能

1. **PR一覧表示**
   - 番号、タイトル、状態、作成者を表示
   - ブランチ情報を表示
   - レビュー状態を表示

2. **フィルタリング**
   - 状態（open/closed/merged）
   - Draft/Ready for review
   - ベースブランチ
   - 作成者/レビュアー

3. **統計情報**
   - Open PR数
   - Draft PR数
   - マージ待ちPR数

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `--state` | PR状態 (`open`/`closed`/`merged`/`all`) | `open` |
| `--draft` | Draft PRのみ表示 | `false` |
| `--ready` | Ready for reviewのみ表示 | `false` |
| `--base` | ベースブランチでフィルタ | - |
| `--head` | HEADブランチでフィルタ | - |
| `--author` | 作成者でフィルタ | - |
| `--reviewer` | レビュアーでフィルタ | - |
| `--label` | ラベルでフィルタ | - |
| `--limit` | 表示件数 | `20` |
| `--json` | JSON形式で出力 | `false` |

## 出力例

### デフォルト出力

```bash
/pr-list
```

出力:
```
Pull Request一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#124 [DRAFT] Fix authentication bug
  ブランチ: feat/issue-889 → main
  作成者: @username
  作成日: 2日前
  状態: Draft
  レビュー: 未レビュー
  チェック: ✓ 3/3 passed
  ラベル: type:bug, automated

#123 Add user profile page
  ブランチ: feat/issue-886 → main
  作成者: @username
  作成日: 5日前
  状態: Ready for review
  レビュー: ✓ Approved (2/2)
  チェック: ✓ 3/3 passed
  ラベル: type:feature

#122 Refactor authentication module
  ブランチ: refactor/auth → main
  作成者: @another-user
  作成日: 1週間前
  状態: Changes requested
  レビュー: ⚠ Changes requested (1/2)
  チェック: ✗ 1/3 failed
  ラベル: type:refactor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

統計:
  Open: 3
  Draft: 1
  Ready for review: 2
  Approved: 1
  Changes requested: 1
```

### Draft PRのみ

```bash
/pr-list --draft
```

出力:
```
Draft Pull Request一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#124 [DRAFT] Fix authentication bug
  ブランチ: feat/issue-889 → main
  作成者: @username
  チェック: ✓ 3/3 passed

#121 [DRAFT] Experimental feature
  ブランチ: experiment/new-ui → main
  作成者: @username
  チェック: - 0/3 running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

合計: 2 Draft PRs
```

### 詳細表示モード

```bash
/pr-list --verbose
```

追加情報:
- コミット数
- 変更ファイル数
- 追加/削除行数
- コメント数
- 最終更新日時

## フィルタリング例

### 自分が作成したPR

```bash
/pr-list --author=@me
```

### 特定ラベルのPR

```bash
/pr-list --label=type:bug
```

### マージ済みPR

```bash
/pr-list --state=merged --limit=10
```

### 特定ブランチへのPR

```bash
/pr-list --base=develop
```

## レビュー状態の表示

| 表示 | 意味 |
|------|------|
| ✓ Approved (2/2) | 承認済み（2名中2名承認） |
| ⚠ Changes requested (1/2) | 変更要求あり |
| 👁 Review requested | レビュー依頼中 |
| - 未レビュー | レビュー未実施 |

## チェック状態の表示

| 表示 | 意味 |
|------|------|
| ✓ 3/3 passed | 全チェック成功 |
| ✗ 1/3 failed | チェック失敗 |
| - 0/3 running | チェック実行中 |
| ⚠ 2/3 pending | チェック保留中 |

## JSON出力

```bash
/pr-list --json
```

出力:
```json
[
  {
    "number": 124,
    "title": "Fix authentication bug",
    "state": "open",
    "isDraft": true,
    "baseRefName": "main",
    "headRefName": "feat/issue-889",
    "author": {
      "login": "username"
    },
    "createdAt": "2025-12-02T10:00:00Z",
    "reviewDecision": "REVIEW_REQUIRED",
    "statusCheckRollup": {
      "state": "SUCCESS"
    },
    "labels": [
      {"name": "type:bug"},
      {"name": "automated"}
    ]
  }
]
```

## ソート順

デフォルトでは作成日時の降順（新しい順）で表示されます。

```bash
# 更新日時順
/pr-list --sort=updated

# コメント数順
/pr-list --sort=comments

# レビュー状態順
/pr-list --sort=review
```

## 実行コマンド

内部的には以下のGitHub CLIコマンドを実行：

```bash
# 基本的な一覧取得
gh pr list --state open --limit 20

# Draft PRのみ
gh pr list --draft

# JSON形式
gh pr list --json number,title,state,isDraft,author,createdAt
```

## 使用例

### 例1: レビュー待ちPRの確認

```bash
/pr-list --ready
```

レビューが必要なPRを確認して、レビューを実施します。

### 例2: マージ可能なPRの確認

```bash
/pr-list --ready | grep "✓ Approved"
```

承認済みでマージ可能なPRを確認します。

### 例3: 長期間openのPRの確認

```bash
/pr-list --state=open --sort=created
```

古いPRから表示し、放置されているPRを確認します。

## トラブルシューティング

### PRが表示されない

```
No pull requests found

原因:
1. フィルタ条件が厳しすぎる
2. Open PRが存在しない
3. リポジトリアクセス権限がない

解決策:
# 全PR確認
/pr-list --state=all

# リポジトリ確認
gh repo view
```

### レビュー状態が表示されない

```
原因: GitHub API権限不足

解決策:
# 認証を再実行
gh auth refresh -h github.com -s repo
```

## ショートカット

```bash
# デフォルト（Open PRs）
/pr-list

# Draft のみ
/pr-list -d

# 自分のPR
/pr-list -a @me

# マージ済み
/pr-list -s merged

# 詳細表示
/pr-list -v
```

## 統計情報

一覧表示の最後に以下の統計を表示：

- Open PR数
- Draft PR数
- Ready for review数
- Approved数（マージ可能）
- Changes requested数
- Review requested数
- Check failed数

## PR管理のベストプラクティス

### 定期確認
```bash
# 毎朝実行してレビュー待ちPRを確認
/pr-list --ready
```

### Draft PRのクリーンアップ
```bash
# 古いDraft PRを確認
/pr-list --draft --sort=created
```

### マージ後のクリーンアップ
```bash
# マージ済みブランチの削除
gh pr list --state merged --json headRefName --jq '.[].headRefName' | xargs -I {} git branch -d {}
```

## 関連コマンド

- `/pr-create <issue>` - PR作成
- `gh pr view <number>` - PR詳細表示
- `gh pr checkout <number>` - PRをチェックアウト
- `gh pr review <number>` - PRレビュー
- `gh pr merge <number>` - PRマージ

---

**ヒント**: 定期的に `/pr-list` を実行して、レビュー待ちPRを確認しましょう。
