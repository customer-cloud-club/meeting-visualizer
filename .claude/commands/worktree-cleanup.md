---
description: Git worktree削除 - 完了したworktreeをクリーンアップ
---

# /worktree-cleanup - Worktree削除

完了したworktreeを安全に削除します。

## 使い方

```bash
# 特定のworktreeを削除
/worktree-cleanup issue-886

# 強制削除（変更があっても削除）
/worktree-cleanup issue-886 --force

# マージ済みのworktreeを全削除
/worktree-cleanup --merged

# 全worktreeを削除（メイン以外）
/worktree-cleanup --all
```

## 機能

1. **安全な削除**
   - 未コミットの変更がある場合は警告
   - マージされていないブランチの場合は確認

2. **自動クリーンアップ**
   - worktreeディレクトリの削除
   - ブランチの削除（オプション）
   - Gitメタデータのクリーンアップ

3. **バッチ削除**
   - マージ済みworktreeの一括削除
   - prunable状態のworktreeの自動削除

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `worktree_name` | 削除するworktree名 | - |
| `--force` | 強制削除（警告を無視） | false |
| `--keep-branch` | ブランチを残す | false |
| `--merged` | マージ済みworktreeのみ削除 | false |
| `--all` | 全worktree削除（メイン以外） | false |
| `--dry-run` | 削除対象を表示のみ | false |

## 実行例

### 例1: 単一worktreeの削除

```bash
/worktree-cleanup issue-886
```

実行内容:
```bash
# 状態確認
git -C ../ccagi-worktrees/issue-886 status

# 変更がない場合は削除
git worktree remove ../ccagi-worktrees/issue-886

# ブランチも削除（デフォルト）
git branch -d feat/issue-886
```

出力:
```
Worktree削除: issue-886
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

パス: ../ccagi-worktrees/issue-886
ブランチ: feat/issue-886
状態: クリーン

✓ worktree削除完了
✓ ブランチ削除完了

削除完了
```

### 例2: 変更があるworktreeの強制削除

```bash
/worktree-cleanup issue-887 --force
```

警告表示:
```
⚠️  警告: 未コミットの変更があります
   - src/auth/login.ts (modified)
   - src/api/users.ts (modified)

本当に削除しますか？ (yes/no): yes

✓ worktree強制削除完了
```

### 例3: ブランチを残して削除

```bash
/worktree-cleanup feature-auth --keep-branch
```

ブランチ `feature-authentication` は残り、worktreeのみ削除されます。

### 例4: マージ済みworktreeの一括削除

```bash
/worktree-cleanup --merged
```

実行内容:
```
マージ済みworktreeを検索中...

削除対象:
  - issue-886 (feat/issue-886) → mainにマージ済み
  - issue-889 (feat/issue-889) → mainにマージ済み

合計: 2 worktrees

削除しますか？ (yes/no): yes

✓ issue-886 削除完了
✓ issue-889 削除完了

完了: 2 worktrees削除
```

### 例5: ドライラン（確認のみ）

```bash
/worktree-cleanup --all --dry-run
```

削除対象のみ表示し、実際には削除しません。

## 削除前の確認

### 未コミットの変更
```
⚠️  警告: 未コミットの変更があります
変更されたファイル:
  - src/auth/login.ts (modified)
  - src/api/users.ts (modified)
  - tests/auth.test.ts (modified)

オプション:
1. 変更をコミット: cd ../ccagi-worktrees/issue-886 && git commit -am "..."
2. 変更を破棄: /worktree-cleanup issue-886 --force
3. worktreeを残す: キャンセル
```

### 未マージのブランチ
```
⚠️  警告: ブランチがmainにマージされていません
ブランチ: feat/issue-887
コミット: 3件先行（mainより）

オプション:
1. PRを作成してマージ: /pr-create 887
2. ブランチを残す: /worktree-cleanup issue-887 --keep-branch
3. 強制削除: /worktree-cleanup issue-887 --force
```

## prunable状態の自動削除

ディレクトリが削除済みのworktreeを自動クリーンアップ：

```bash
# prunable状態のworktreeを削除
git worktree prune

# 一覧で確認
/worktree-list
```

## ベストプラクティス

### PR作成後の削除
```bash
# 1. PRを作成
/pr-create 886

# 2. PRがマージされたら削除
/worktree-cleanup issue-886
```

### 定期的なクリーンアップ
```bash
# 週次でマージ済みworktreeを削除
/worktree-cleanup --merged

# prunable状態のworktreeを削除
git worktree prune
```

### 一時的な実験の削除
```bash
# 実験用worktreeは強制削除でOK
/worktree-cleanup experiment-perf --force
```

## トラブルシューティング

### worktreeが削除できない

```
Error: Cannot remove working tree '/path/to/worktree'

原因:
1. ディレクトリが存在しない → git worktree prune
2. ロックされている → git worktree unlock /path/to/worktree
3. プロセスが使用中 → プロセスを終了してから削除
```

### ブランチが削除できない

```
Error: The branch 'feat/issue-886' is not fully merged

解決策:
# ブランチを残す
/worktree-cleanup issue-886 --keep-branch

# または強制削除
git branch -D feat/issue-886
```

### ディレクトリが残る

```
# worktree削除後もディレクトリが残る場合
rm -rf ../ccagi-worktrees/issue-886

# Gitメタデータをクリーンアップ
git worktree prune
```

## 関連コマンド

- `/worktree-create <name>` - 新しいworktreeを作成
- `/worktree-list` - worktree一覧表示
- `git worktree prune` - prunable状態のworktreeを削除

## 安全機能

### 自動バックアップ
削除前に未コミットの変更をstashとして保存：

```bash
# 変更を一時保存
git -C /path/to/worktree stash push -m "Auto-stash before cleanup"

# worktree削除
git worktree remove /path/to/worktree

# 必要に応じて復元
git stash list
git stash apply stash@{0}
```

### 削除ログ
削除操作は自動的にログに記録されます：

```bash
# ログファイル: .ai/logs/worktree-cleanup.log
cat .ai/logs/worktree-cleanup.log
```

## 統計情報

削除完了後に表示される統計：

```
削除完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

削除したworktree: 3
削除したブランチ: 2
残したブランチ: 1
解放したディスク容量: 145 MB

現在のworktree数: 2
```

---

**ヒント**: 作業完了後は速やかにworktreeを削除して、ディスク容量とプロジェクトの見通しを保ちましょう。
