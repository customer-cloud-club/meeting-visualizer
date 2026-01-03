# リリース公開

リリースを公開します。

## 前提条件

- release-prepareが完了していること
- 全てのCIチェックがパス

## 実行

```bash
# GitHubリリース作成
gh release create v$(node -p "require('./package.json').version") \
  --title "v$(node -p "require('./package.json').version")" \
  --notes-file RELEASE_NOTES.md

# npmパッケージ公開（該当する場合）
npm publish

# Dockerイメージプッシュ
docker push ccagi:$(node -p "require('./package.json').version")
```

## 確認

1. GitHubリリースページ確認
2. デプロイ状況確認
3. 監視ダッシュボード確認
