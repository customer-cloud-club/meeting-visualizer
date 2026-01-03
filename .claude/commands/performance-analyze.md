# パフォーマンス分析

アプリケーションのパフォーマンスを分析します。

## 分析対象

1. バンドルサイズ分析
2. API レスポンスタイム
3. メモリ使用量
4. CPUプロファイリング

## 実行

performance agentを起動して分析を実行してください。

```bash
# バンドル分析
npx webpack-bundle-analyzer stats.json

# Lighthouse
npx lighthouse http://localhost:3000 --output=json

# Node.jsプロファイリング
node --prof app.js
```

## 出力

分析結果は`.ai/performance/`ディレクトリに保存されます。
