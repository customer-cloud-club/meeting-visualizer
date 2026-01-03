# キャッシュクリア

各種キャッシュをクリアします。

## 実行

```bash
# npm キャッシュ
npm cache clean --force

# node_modules再インストール
rm -rf node_modules && npm install

# ビルドキャッシュ
rm -rf .next .nuxt dist build

# TypeScriptキャッシュ
rm -rf tsconfig.tsbuildinfo

# Jestキャッシュ
npx jest --clearCache
```

## Docker キャッシュ

```bash
# ビルドキャッシュ削除
docker builder prune

# 未使用イメージ削除
docker image prune
```
