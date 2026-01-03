# 仕様書作成

新しい仕様書を作成します。

## パラメータ

- `$1`: 仕様書タイプ（feature, api, component, workflow）
- `$2`: 名前（必須）

## 実行

speckit_generate ツールを使用して仕様書を生成してください：

```javascript
speckit_generate({
  type: "${1:-feature}",
  name: "${2}",
  outputPath: "docs/specs/${2}.md"
})
```

## テンプレート

利用可能なテンプレート:
- feature: 機能仕様書
- api: API仕様書
- component: コンポーネント仕様書
- workflow: ワークフロー仕様書
- architecture: アーキテクチャ仕様書
