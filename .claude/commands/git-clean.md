# Git クリーンアップ

不要なブランチやファイルを削除します。

## 実行

```bash
# マージ済みローカルブランチ削除
git branch --merged | grep -v '\*\|main\|master' | xargs -n 1 git branch -d

# リモート追跡ブランチ削除
git fetch --prune

# 未追跡ファイル確認
git clean -n

# 未追跡ファイル削除
git clean -fd
```

## 注意

- `git clean -fd`は復元不可能
- 重要なファイルが含まれていないか事前確認
