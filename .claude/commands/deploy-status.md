---
description: デプロイ状態確認 - 環境の現在の状態を表示
---

# /deploy-status - デプロイ状態確認

各環境のデプロイ状態を確認します。

## 使い方

```bash
# 全環境の状態確認
/deploy-status

# 特定環境の状態確認
/deploy-status production

# リアルタイム監視
/deploy-status production --watch

# 詳細表示
/deploy-status staging --verbose
```

## 機能

1. **デプロイ状態表示**
   - 現在のバージョン
   - デプロイ日時
   - ヘルスチェック結果

2. **リソース状態**
   - CPU使用率
   - メモリ使用率
   - レスポンスタイム

3. **履歴表示**
   - 最近のデプロイ履歴
   - ロールバック履歴

## 出力例

### 全環境の状態

```bash
/deploy-status
```

出力:
```
デプロイ状態
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

production (本番環境)
  状態: ✓ 稼働中
  バージョン: v1.2.3 (bc3d9e1)
  デプロイ: 2025-12-03 14:30:00 (1日前)
  デプロイ者: @username
  戦略: Blue-Green

  ヘルスチェック:
    ✓ API: 200 OK (45ms)
    ✓ Database: Connected
    ✓ Redis: Connected

  リソース:
    CPU: 23% (8 vCPU)
    Memory: 45% (16GB / 32GB)
    Instances: 3/3 healthy

  URL: https://app.example.com

staging (ステージング環境)
  状態: ✓ 稼働中
  バージョン: v1.3.0-beta (f96da07)
  デプロイ: 2025-12-04 10:15:00 (5時間前)
  デプロイ者: @username
  戦略: Rolling Update

  ヘルスチェック:
    ✓ API: 200 OK (32ms)
    ✓ Database: Connected
    ✓ Redis: Connected

  リソース:
    CPU: 15% (4 vCPU)
    Memory: 38% (8GB / 16GB)
    Instances: 2/2 healthy

  URL: https://staging.example.com

development (開発環境)
  状態: ✓ 稼働中
  バージョン: dev (d209711)
  デプロイ: 2025-12-04 15:00:00 (30分前)
  デプロイ者: @developer

  ヘルスチェック:
    ✓ API: 200 OK (28ms)
    ✓ Database: Connected

  URL: https://dev.example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

全環境: 正常稼働中
```

### 特定環境の詳細

```bash
/deploy-status production --verbose
```

出力:
```
production - 詳細情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

基本情報:
  環境: production
  状態: ✓ 稼働中
  バージョン: v1.2.3
  コミット: bc3d9e1
  ブランチ: main
  デプロイ日時: 2025-12-03 14:30:00 JST
  デプロイ者: @username
  戦略: Blue-Green Deployment

サービス情報:
  プラットフォーム: AWS ECS
  クラスター: ccagi-production
  サービス: ccagi-app
  タスク定義: ccagi-app:45
  実行中タスク: 3/3

インスタンス状態:
  Instance 1: ✓ Healthy (CPU: 21%, Memory: 43%)
  Instance 2: ✓ Healthy (CPU: 24%, Memory: 46%)
  Instance 3: ✓ Healthy (CPU: 25%, Memory: 47%)

ヘルスチェック:
  エンドポイント: https://app.example.com/health
  ステータス: 200 OK
  レスポンスタイム: 45ms (平均: 52ms)
  最終チェック: 30秒前

  詳細:
    ✓ API Server: Healthy
    ✓ Database (PostgreSQL): Connected (12ms)
    ✓ Redis Cache: Connected (3ms)
    ✓ External API: Reachable (125ms)

リソース使用状況:
  CPU: 23% / 100% (8 vCPU)
    - 5分平均: 21%
    - 15分平均: 19%

  Memory: 14.4GB / 32GB (45%)
    - Heap: 8.2GB
    - Non-heap: 2.1GB
    - Buffer: 4.1GB

  Network:
    - In: 12.5 Mbps
    - Out: 8.3 Mbps

  Disk:
    - Usage: 45% (45GB / 100GB)
    - IOPS: 250 (avg)

パフォーマンス指標:
  Requests/sec: 125
  Error Rate: 0.02%
  P50 Latency: 35ms
  P95 Latency: 120ms
  P99 Latency: 280ms

最近のデプロイ履歴:
  v1.2.3 (bc3d9e1) - 2025-12-03 14:30 ✓ Success
  v1.2.2 (f96da07) - 2025-12-01 10:15 ✓ Success
  v1.2.1 (d209711) - 2025-11-28 16:45 ✓ Success
  v1.2.0 (614ce57) - 2025-11-25 11:20 ✗ Rolled back

環境変数:
  NODE_ENV: production
  DATABASE_URL: postgresql://***
  REDIS_URL: redis://***
  API_KEY: ***
  (全10個の環境変数設定済み)

エンドポイント:
  API: https://app.example.com
  WebSocket: wss://app.example.com/ws
  Admin: https://admin.example.com
  Docs: https://docs.example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 環境は正常に稼働しています
```

### リアルタイム監視

```bash
/deploy-status production --watch
```

5秒ごとに状態を更新表示：

```
[15:30:00] production
  Status: ✓ Healthy
  CPU: 23% | Memory: 45% | Requests: 125/s
  Latency: P50=35ms P95=120ms P99=280ms

[15:30:05] production
  Status: ✓ Healthy
  CPU: 24% | Memory: 45% | Requests: 128/s
  Latency: P50=33ms P95=115ms P99=275ms

[15:30:10] production
  Status: ✓ Healthy
  CPU: 22% | Memory: 44% | Requests: 122/s
  Latency: P50=37ms P95=125ms P99=285ms

Press Ctrl+C to stop...
```

## 状態インジケーター

| 表示 | 意味 |
|------|------|
| ✓ 稼働中 | 正常稼働 |
| ⚠ 警告 | 軽微な問題あり |
| ✗ エラー | 重大な問題あり |
| 🔄 デプロイ中 | デプロイ実行中 |
| 🔙 ロールバック中 | ロールバック実行中 |
| ⏸ 停止中 | サービス停止中 |

## ヘルスチェック詳細

ヘルスチェックの各項目：

1. **API Server**: アプリケーションサーバーの稼働状態
2. **Database**: データベース接続状態
3. **Redis**: キャッシュサーバー接続状態
4. **External API**: 外部API接続状態
5. **Disk Space**: ディスク容量
6. **Memory**: メモリ使用率

## デプロイ履歴

最近のデプロイ履歴を表示：

```bash
/deploy-status production --history
```

出力:
```
デプロイ履歴 (production)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#45 v1.2.3 (bc3d9e1)
  日時: 2025-12-03 14:30:00
  デプロイ者: @username
  戦略: Blue-Green
  結果: ✓ Success (5分12秒)
  ロールバック: なし

#44 v1.2.2 (f96da07)
  日時: 2025-12-01 10:15:00
  デプロイ者: @username
  戦略: Rolling Update
  結果: ✓ Success (3分45秒)
  ロールバック: なし

#43 v1.2.1 (d209711)
  日時: 2025-11-28 16:45:00
  デプロイ者: @lead-engineer
  戦略: Blue-Green
  結果: ✓ Success (4分58秒)
  ロールバック: なし

#42 v1.2.0 (614ce57)
  日時: 2025-11-25 11:20:00
  デプロイ者: @developer
  戦略: Rolling Update
  結果: ✗ Failed - Rolled back to v1.1.9
  理由: Health check failed
  ロールバック: #41 (v1.1.9)
```

## JSON出力

```bash
/deploy-status production --json
```

出力:
```json
{
  "environment": "production",
  "status": "healthy",
  "version": "v1.2.3",
  "commit": "bc3d9e1",
  "deployedAt": "2025-12-03T14:30:00Z",
  "deployedBy": "username",
  "strategy": "blue-green",
  "health": {
    "api": {
      "status": "healthy",
      "responseTime": 45
    },
    "database": {
      "status": "connected",
      "latency": 12
    },
    "redis": {
      "status": "connected",
      "latency": 3
    }
  },
  "resources": {
    "cpu": {
      "usage": 23,
      "total": 800
    },
    "memory": {
      "used": 15461882470,
      "total": 34359738368,
      "percent": 45
    },
    "instances": {
      "running": 3,
      "total": 3
    }
  },
  "url": "https://app.example.com"
}
```

## アラート条件

以下の条件で警告を表示：

- CPU使用率 > 80%
- メモリ使用率 > 85%
- エラーレート > 1%
- P99レイテンシ > 1000ms
- インスタンス異常 > 1台

## トラブルシューティング

### ヘルスチェックが失敗

```
Status: ✗ エラー
Health Check: Failed

原因:
1. アプリケーションダウン
2. データベース接続エラー
3. 外部API障害

解決策:
# ログ確認
/logs --environment=production --tail=100

# 必要に応じてロールバック
/deploy-rollback production
```

### CPU使用率が高い

```
Status: ⚠ 警告
CPU: 85%

原因:
1. トラフィック急増
2. 無限ループ
3. リソース不足

解決策:
# スケールアウト
aws ecs update-service --desired-count 5

# または一時的にトラフィック制限
```

## 監視ダッシュボード

より詳細な監視は以下で確認：

- **CloudWatch**: AWS Console
- **Grafana**: https://grafana.example.com
- **DataDog**: https://app.datadoghq.com

## 関連コマンド

- `/deploy-execute <environment>` - デプロイ実行
- `/deploy-rollback <environment>` - ロールバック
- `/logs --environment=<env>` - ログ確認
- `/health-check` - ヘルスチェック実行

---

**ヒント**: `--watch` オプションでリアルタイム監視し、デプロイ後の状態を確認しましょう。
