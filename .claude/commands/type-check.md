# 型チェック実行

TypeScriptの型チェックを実行します。

## 実行

```bash
# 型チェックのみ
npx tsc --noEmit

# watchモード
npx tsc --noEmit --watch

# 特定ファイル
npx tsc --noEmit src/path/to/file.ts
```

## エラー対応

型エラーが発生した場合:

1. エラーメッセージを確認
2. 期待される型と実際の型を比較
3. 型アノテーションを追加/修正
4. 必要に応じて型定義を更新
