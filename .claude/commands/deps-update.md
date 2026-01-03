# 依存関係更新

パッケージの依存関係を更新します。

## 実行

```bash
# 更新可能なパッケージ確認
npm outdated

# マイナーアップデート
npm update

# メジャーアップデート（対話式）
npx npm-check-updates -i

# 特定パッケージ更新
npm install package@latest
```

## セキュリティ更新

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix

# 強制修正（破壊的変更あり）
npm audit fix --force
```
