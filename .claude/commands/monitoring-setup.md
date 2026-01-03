# モニタリング設定

監視・アラートを設定します。

## 実行

monitoring agentを起動して、以下を設定してください：

1. メトリクス収集設定
2. アラートルール
3. ダッシュボード

## メトリクス例

```yaml
metrics:
  - name: http_request_duration_seconds
    type: histogram
    labels: [method, path, status]

  - name: active_connections
    type: gauge
```

## アラートルール例

```yaml
alerts:
  - name: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    severity: critical
```
