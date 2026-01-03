# コンポーネント作成

新しいUIコンポーネントを作成します。

## パラメータ

- `$1`: コンポーネント名（必須、PascalCase）
- `$2`: タイプ（optional: atom, molecule, organism, template）

## 生成ファイル

```
src/components/${1}/
├── ${1}.tsx          # コンポーネント本体
├── ${1}.test.tsx     # テスト
├── ${1}.stories.tsx  # Storybook
├── ${1}.module.css   # スタイル
└── index.ts          # エクスポート
```

## 実行

frontend agentを起動して、コンポーネントを生成してください。

アクセシビリティ（ARIA属性）を忘れずに実装してください。
