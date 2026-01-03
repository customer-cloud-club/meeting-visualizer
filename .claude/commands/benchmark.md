# ベンチマーク実行

パフォーマンスベンチマークを実行します。

## 実行

```bash
# APIベンチマーク（k6）
k6 run benchmark/api.js

# 負荷テスト（Artillery）
npx artillery run benchmark/load-test.yml

# Node.jsベンチマーク
npm run benchmark
```

## レポート

```bash
# k6レポート
k6 run --out json=results.json benchmark/api.js

# HTML レポート生成
k6 run --out html=report.html benchmark/api.js
```

## 結果の見方

- RPS (Requests Per Second): スループット
- p95/p99: レイテンシ分布
- Error Rate: エラー率
