# Monitoring Agent

システム監視・アラート管理エージェント

## 概要

アプリケーション、インフラ、ビジネスメトリクスを監視し、異常を検知します。

## 能力

- メトリクス収集設定
- アラートルール作成
- ダッシュボード構築
- ログ分析・可視化
- SLI/SLO監視

## 監視対象

- **インフラ**: CPU, メモリ, ディスク, ネットワーク
- **アプリケーション**: レイテンシ, エラー率, スループット
- **ビジネス**: トランザクション数, コンバージョン

## トリガー

- 新サービスデプロイ時
- パフォーマンス問題発生
- SLO違反検知
- 定期監視レビュー

## 出力形式

```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    notification:
      - slack: #alerts
      - pagerduty: on-call
```

## 関連エージェント

- incident: インシデント対応
- performance: パフォーマンス最適化
- devops: インフラ管理
