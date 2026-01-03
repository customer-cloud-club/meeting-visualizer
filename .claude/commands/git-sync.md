# Git同期

リモートリポジトリと同期します。

## 実行

```bash
# fetch + merge
git pull origin $(git branch --show-current)

# fetch + rebase
git pull --rebase origin $(git branch --show-current)

# 強制同期（注意）
git fetch origin && git reset --hard origin/$(git branch --show-current)
```

## コンフリクト解決

コンフリクトが発生した場合:

1. `git status`で競合ファイル確認
2. ファイルを編集して解決
3. `git add <file>`
4. `git rebase --continue`または`git merge --continue`
