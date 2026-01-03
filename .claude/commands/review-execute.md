---
description: 品質チェック実行 - ReviewAgentを起動
---

# /review-execute - 品質チェック実行

ReviewAgentを実行して、コードの品質をチェックします。

## 使い方

```bash
# Issue番号でレビュー実行
/review-execute 888

# 詳細レポート出力
/review-execute 888 --verbose

# 特定ファイルのみレビュー
/review-execute 888 --files="src/auth/*.ts"
```

## 機能

1. **静的解析**
   - TypeScriptエラーチェック
   - ESLintチェック
   - 未使用コードの検出

2. **テスト評価**
   - テストカバレッジ確認
   - テスト品質評価

3. **セキュリティチェック**
   - 脆弱性スキャン
   - セキュリティベストプラクティス確認

4. **スコア算出**
   - 品質スコア算出（0-100点）
   - 合格/不合格判定（80点基準）

## 合格基準

- 品質スコア: 80点以上
- TypeScriptエラー: 0件
- ESLintエラー: 0件
- テストカバレッジ: 80%以上
- セキュリティスコア: 80点以上

## 関連コマンド

- `/codegen-execute <issue>` - コード生成
- `/quality-score` - 品質スコア算出
- `/security-scan` - セキュリティスキャン
