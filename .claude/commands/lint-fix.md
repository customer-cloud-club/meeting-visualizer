# Lint修正

ESLint/Prettierでコードを自動修正します。

## 実行

```bash
# ESLint自動修正
npm run lint -- --fix

# Prettier フォーマット
npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

# 両方実行
npm run lint:fix && npm run format
```

## チェック対象

- TypeScript/JavaScript
- CSS/SCSS
- JSON/YAML
- Markdown

## 設定ファイル

- `.eslintrc.js` - ESLint設定
- `.prettierrc` - Prettier設定
- `.editorconfig` - エディタ設定
