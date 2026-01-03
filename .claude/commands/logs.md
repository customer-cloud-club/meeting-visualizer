---
description: ログ表示 - アプリケーションログを確認
---

# /logs - ログ表示

アプリケーションのログを表示します。

## 使い方

```bash
# 最新ログ表示
/logs

# 特定環境のログ
/logs --environment=production

# エラーログのみ
/logs --level=error

# 最新100行
/logs --tail=100

# リアルタイム監視
/logs --follow

# 期間指定
/logs --since=1h
/logs --since="2025-12-04 10:00:00"
```

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `--environment` | 環境 | `production` |
| `--level` | ログレベル | `all` |
| `--tail` | 表示行数 | `50` |
| `--follow` | リアルタイム監視 | `false` |
| `--since` | 期間 | `10m` |
| `--grep` | 検索パターン | - |

## ログレベル

- `debug`: デバッグ情報
- `info`: 一般情報
- `warn`: 警告
- `error`: エラー
- `fatal`: 致命的エラー

## 出力例

```
ログ表示: production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-04 15:30:00 [INFO] Server started on port 3000
2025-12-04 15:30:05 [INFO] Database connection established
2025-12-04 15:30:10 [INFO] Redis connection established
2025-12-04 15:31:23 [WARN] Slow query detected: 250ms
2025-12-04 15:32:45 [ERROR] API request failed: timeout
2025-12-04 15:33:12 [INFO] Request completed: 200 OK (45ms)
2025-12-04 15:34:01 [INFO] Request completed: 200 OK (38ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
表示: 最新50行 | レベル: all | 環境: production
```

## リアルタイム監視

```bash
/logs --follow
```

出力:
```
[15:35:00] [INFO] Request: GET /api/users
[15:35:00] [INFO] Response: 200 OK (42ms)
[15:35:02] [INFO] Request: POST /api/auth/login
[15:35:02] [INFO] Response: 200 OK (125ms)
[15:35:05] [ERROR] Request failed: Connection timeout
[15:35:05] [INFO] Retry attempt 1/3
[15:35:06] [INFO] Response: 200 OK (85ms)

Press Ctrl+C to stop...
```

## 検索

```bash
# エラーログのみ
/logs --level=error

# 特定パターン検索
/logs --grep="API request failed"

# 複数条件
/logs --level=error --since=1h --grep="timeout"
```

## 関連コマンド

- `/health-check` - ヘルスチェック
- `/deploy-status` - デプロイ状態
