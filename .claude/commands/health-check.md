---
description: ヘルスチェック - システム全体の健全性確認
---

# /health-check - ヘルスチェック

システム全体の健全性をチェックします。

## 使い方

```bash
# 全環境のヘルスチェック
/health-check

# 特定環境のヘルスチェック
/health-check --environment=production

# 詳細モード
/health-check --verbose

# 継続監視
/health-check --watch
```

## チェック項目

1. **アプリケーション**
   - APIエンドポイント応答
   - レスポンスタイム
   - エラーレート

2. **データベース**
   - 接続状態
   - クエリパフォーマンス
   - コネクションプール

3. **キャッシュ**
   - Redis接続
   - ヒット率
   - メモリ使用量

4. **外部サービス**
   - 外部API接続
   - サードパーティサービス

5. **インフラ**
   - CPU使用率
   - メモリ使用率
   - ディスク使用率

## 出力例

```
ヘルスチェック
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

production環境
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

アプリケーション:
  ✓ API Server: Healthy (45ms)
  ✓ WebSocket: Connected
  ✓ Error Rate: 0.02%

データベース:
  ✓ PostgreSQL: Connected (12ms)
  ✓ Query Performance: Good
  ✓ Connections: 25/100

キャッシュ:
  ✓ Redis: Connected (3ms)
  ✓ Hit Rate: 92%
  ✓ Memory: 45% (2.3GB / 5GB)

外部サービス:
  ✓ GitHub API: Reachable (125ms)
  ✓ Anthropic API: Reachable (230ms)

インフラ:
  ✓ CPU: 23% (8 vCPU)
  ✓ Memory: 45% (14GB / 32GB)
  ✓ Disk: 34% (34GB / 100GB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 全体: 正常
```

## ステータス

| 表示 | 意味 |
|------|------|
| ✓ Healthy | 正常 |
| ⚠ Warning | 警告 |
| ✗ Critical | 重大 |
| - Unknown | 不明 |

## 関連コマンド

- `/deploy-status` - デプロイ状態
- `/logs` - ログ確認
