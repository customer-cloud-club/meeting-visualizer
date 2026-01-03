# リリース準備

リリースの準備を行います。

## チェックリスト

- [ ] 全テストパス
- [ ] 型チェックパス
- [ ] Lintエラーなし
- [ ] ドキュメント更新済み
- [ ] CHANGELOG更新済み
- [ ] バージョン番号更新済み

## 実行

```bash
# バージョンバンプ
npm version patch|minor|major

# CHANGELOGの生成
npx conventional-changelog -p angular -i CHANGELOG.md -s

# タグ作成
git tag -a v$(node -p "require('./package.json').version") -m "Release"
```

## リリースノート

リリースノートには以下を含めてください：
- 新機能
- バグ修正
- 破壊的変更
- 移行ガイド
