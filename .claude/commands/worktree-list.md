---
description: Git worktree一覧表示 - 現在の作業ディレクトリを確認
---

# /worktree-list - Worktree一覧表示

現在作成されているすべてのGit worktreeを表示します。

## 使い方

```bash
/worktree-list
```

## 出力例

```
Git Worktree一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/Users/kazuaki/Desktop/ccagi-system
  ブランチ: main
  コミット: bc3d9e1
  状態: (bare)

/Users/kazuaki/Desktop/ccagi-worktrees/issue-886
  ブランチ: feat/issue-886
  コミット: bc3d9e1
  状態: クリーン

/Users/kazuaki/Desktop/ccagi-worktrees/issue-887
  ブランチ: feat/issue-887
  コミット: f96da07
  状態: 変更あり (3 ファイル)

/Users/kazuaki/Desktop/ccagi-worktrees/feature-auth
  ブランチ: feature-authentication
  コミット: d209711
  状態: クリーン

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

合計: 4 worktrees (メイン: 1, 作業用: 3)
```

## 表示情報

各worktreeについて以下の情報を表示します：

1. **パス**: worktreeのファイルシステムパス
2. **ブランチ**: チェックアウトされているブランチ名
3. **コミット**: 現在のHEADコミットハッシュ
4. **状態**:
   - `(bare)`: メインリポジトリ（裸のリポジトリ）
   - `クリーン`: 変更なし
   - `変更あり (N ファイル)`: 未コミットの変更がある
   - `コンフリクト`: マージコンフリクトがある
   - `prunable`: 削除可能（ディレクトリが存在しない）

## 詳細表示モード

```bash
# 詳細情報を表示
/worktree-list --verbose
```

詳細モードの追加情報:
- 最終コミット日時
- コミットメッセージ
- 変更されたファイル一覧
- アップストリームブランチとの差分

## フィルタリング

```bash
# ブランチ名でフィルタ
/worktree-list --filter=issue-

# 変更があるworktreeのみ
/worktree-list --dirty-only

# クリーンなworktreeのみ
/worktree-list --clean-only
```

## 実行コマンド

内部的には以下のGitコマンドを実行しています：

```bash
# Worktree一覧取得
git worktree list

# 各worktreeの状態確認
git -C /path/to/worktree status --porcelain

# ブランチ情報
git -C /path/to/worktree branch -vv
```

## 使用例

### 例1: 作業中のworktreeを確認

```bash
/worktree-list
```

複数のIssueを並行作業している場合、どのworktreeでどのブランチを作業中か一目で確認できます。

### 例2: 変更があるworktreeを確認

```bash
/worktree-list --dirty-only
```

コミット忘れや作業中のworktreeを確認できます。

### 例3: クリーンアップ対象の確認

```bash
/worktree-list
```

`prunable` 状態のworktreeは削除可能です：
```bash
/worktree-cleanup <name>
```

## トラブルシューティング

### worktreeが表示されない

```bash
# Gitリポジトリのルートで実行されているか確認
pwd
git rev-parse --show-toplevel

# Gitリポジトリでない場合
Error: not a git repository
```

### prunable状態のworktree

```
/path/to/worktree
  ブランチ: feat/issue-999
  状態: prunable

解決策:
# worktreeを削除
git worktree prune
```

### locked状態のworktree

```
/path/to/worktree
  ブランチ: feat/issue-888
  状態: locked

原因: 別のプロセスが使用中、または手動でロックされている

解決策:
# ロックを解除
git worktree unlock /path/to/worktree
```

## ショートカット

```bash
# 一覧表示
/worktree-list

# 詳細表示
/worktree-list -v

# 変更があるもののみ
/worktree-list -d

# クリーンなもののみ
/worktree-list -c
```

## 関連コマンド

- `/worktree-create <name>` - 新しいworktreeを作成
- `/worktree-cleanup <name>` - worktreeを削除
- `git worktree list` - Git標準コマンド

## 統計情報

一覧表示の最後に以下の統計を表示：

- 合計worktree数
- メインリポジトリ数
- 作業用worktree数
- 変更があるworktree数
- クリーンなworktree数
- 削除可能なworktree数

---

**ヒント**: 定期的に `/worktree-list` を実行して、作業中のworktreeを整理しましょう。
