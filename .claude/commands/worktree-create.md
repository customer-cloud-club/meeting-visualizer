---
description: Git worktree作成 - Issue/Feature別の作業ディレクトリ
---

# /worktree-create - Worktree作成コマンド

Git worktreeを作成して、複数のIssue/Featureを並行作業できる環境を構築します。

## 使い方

```bash
# Issue番号で作成
/worktree-create 886

# ブランチ名を指定
/worktree-create issue-886 --base=main

# カスタムパスで作成
/worktree-create feature-auth --path=../ccagi-worktrees/auth
```

## 機能

1. **git worktree作成**
   - 指定したブランチで新しい作業ディレクトリを作成

2. **ブランチ自動命名**
   - Issue番号から `feat/issue-XXX` 形式で自動命名
   - カスタムブランチ名も指定可能

3. **作業ディレクトリ準備**
   - npm/yarn依存関係のインストール
   - 環境ファイルのコピー

## パラメータ

| パラメータ | 説明 | デフォルト | 例 |
|-----------|------|----------|-----|
| `issue_number` | Issue番号またはブランチ名 | - | `886` |
| `--base` | ベースブランチ | `main` | `--base=develop` |
| `--path` | worktreeの配置パス | `../ccagi-worktrees/{name}` | `--path=../wt/auth` |
| `--no-install` | 依存関係のインストールをスキップ | false | `--no-install` |

## 実行例

### 例1: Issue番号で作成

```bash
/worktree-create 886
```

実行内容:
```bash
# ブランチ作成: feat/issue-886
# パス: ../ccagi-worktrees/issue-886
git worktree add ../ccagi-worktrees/issue-886 -b feat/issue-886 main
cd ../ccagi-worktrees/issue-886
npm install
```

### 例2: カスタムブランチ名

```bash
/worktree-create feature-authentication --base=develop
```

実行内容:
```bash
# ブランチ: feature-authentication
# ベース: develop
git worktree add ../ccagi-worktrees/feature-authentication -b feature-authentication develop
```

### 例3: 既存ブランチをチェックアウト

```bash
/worktree-create existing-branch --no-create
```

実行内容:
```bash
# 既存ブランチ existing-branch をworktreeに追加
git worktree add ../ccagi-worktrees/existing-branch existing-branch
```

## worktreeのメリット

### 並行作業
複数のIssueを同時に作業できます：
```
ccagi-system/           # メインプロジェクト（main）
../ccagi-worktrees/
  ├── issue-886/        # Issue #886作業中
  ├── issue-887/        # Issue #887作業中
  └── feature-auth/     # 認証機能開発中
```

### クリーンな環境
各worktreeは独立した作業ツリーを持ち、変更が混在しません。

### 高速切り替え
`cd` するだけでブランチを切り替えられます（`git checkout` 不要）。

## worktreeのディレクトリ構造

```
ccagi-system/
  .git/                 # 共有Gitリポジトリ
  src/
  package.json
  README.md

../ccagi-worktrees/
  issue-886/
    .git                # worktreeリンク
    src/
    package.json        # 独立した依存関係
  issue-887/
    .git
    src/
    package.json
```

## ベストプラクティス

### 命名規則
```bash
# Issue番号
/worktree-create 886              # → feat/issue-886

# Feature
/worktree-create feature-auth     # → feature-auth

# Bugfix
/worktree-create bugfix-login     # → bugfix-login

# Experiment
/worktree-create experiment-perf  # → experiment-perf
```

### クリーンアップ
作業完了後は削除：
```bash
/worktree-cleanup issue-886
```

### 一覧表示
現在のworktreeを確認：
```bash
/worktree-list
```

## トラブルシューティング

### ブランチが既に存在する
```
Error: A branch named 'feat/issue-886' already exists

解決策:
# 既存ブランチを使う場合
/worktree-create 886 --no-create

# 別名で作成
/worktree-create issue-886-v2
```

### worktreeディレクトリが既に存在する
```
Error: directory exists: ../ccagi-worktrees/issue-886

解決策:
# ディレクトリを削除
rm -rf ../ccagi-worktrees/issue-886

# または別のパスを指定
/worktree-create 886 --path=../wt/issue-886-new
```

### 依存関係のインストールに失敗
```
Error: npm install failed

解決策:
# 手動でインストール
cd ../ccagi-worktrees/issue-886
npm install

# またはインストールをスキップ
/worktree-create 886 --no-install
```

## 関連コマンド

- `/worktree-list` - worktree一覧表示
- `/worktree-cleanup <name>` - worktree削除
- `/pr-create` - worktreeからPR作成

## 参考情報

- [Git worktree公式ドキュメント](https://git-scm.com/docs/git-worktree)
- CCAGIワークフローガイド: `.ai/requirements/workflow.md`

---

**ヒント**: worktreeを使えば、コンテキストスイッチのコストを大幅に削減できます。
