---
description: ロールバック実行 - 前のバージョンに戻す
---

# /deploy-rollback - ロールバック実行

デプロイに問題がある場合、前のバージョンにロールバックします。

## 使い方

```bash
# 直前のバージョンにロールバック
/deploy-rollback production

# 特定バージョンにロールバック
/deploy-rollback production --version=v1.2.2

# 特定コミットにロールバック
/deploy-rollback production --commit=f96da07

# ドライラン（確認のみ）
/deploy-rollback production --dry-run
```

## 機能

1. **高速ロールバック**
   - Blue-Greenの場合: 数秒でロールバック
   - Rolling Updateの場合: 1-2分でロールバック

2. **安全なロールバック**
   - ロールバック前の状態確認
   - 二重確認プロンプト（本番環境）
   - ロールバック後のヘルスチェック

3. **履歴管理**
   - ロールバック履歴を記録
   - 原因の記録

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|----------|
| `environment` | ロールバック対象環境 | - |
| `--version` | ロールバック先バージョン | 直前のバージョン |
| `--commit` | ロールバック先コミット | - |
| `--reason` | ロールバック理由 | - |
| `--dry-run` | 実行せず確認のみ | `false` |
| `--force` | 強制ロールバック | `false` |

## 実行例

### 例1: 直前のバージョンにロールバック

```bash
/deploy-rollback production
```

実行内容:
```
ロールバック実行: production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

現在のバージョン:
  Version: v1.2.3
  Commit: bc3d9e1
  Deployed: 2025-12-03 14:30:00
  Status: ✗ Unhealthy

ロールバック先:
  Version: v1.2.2
  Commit: f96da07
  Deployed: 2025-12-01 10:15:00
  Status: ✓ Was stable

⚠️  本番環境のロールバックを実行します

影響:
  - 全ユーザーに影響
  - v1.2.3の変更が取り消されます
  - ダウンタイム: 約30秒

本当にロールバックしますか？ (yes/no): yes

[1/5] ロールバック準備中...
  ✓ 前バージョン情報取得完了
  ✓ イメージ存在確認完了

[2/5] トラフィック切り替え中...
  ✓ Blue環境 (v1.2.2) に切り替え完了

[3/5] ヘルスチェック中...
  ✓ API: 200 OK
  ✓ Database: Connected
  ✓ Redis: Connected

[4/5] 旧環境シャットダウン中...
  ✓ Green環境 (v1.2.3) 停止完了

[5/5] ロールバック完了
  Current Version: v1.2.2 (f96da07)
  Status: ✓ Healthy
  Rolled back: 2025-12-04 15:45:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ ロールバック成功 (所要時間: 32秒)

次のステップ:
1. 動作確認: https://app.example.com
2. ログ確認: /logs --environment=production
3. 原因調査: v1.2.3のデプロイログを確認
```

### 例2: 特定バージョンにロールバック

```bash
/deploy-rollback production --version=v1.2.1 --reason="Critical bug in v1.2.2 and v1.2.3"
```

v1.2.2をスキップしてv1.2.1にロールバックします。

### 例3: ドライラン

```bash
/deploy-rollback production --dry-run
```

実行内容:
```
[DRY RUN] ロールバック: production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

実行予定の内容:
  現在: v1.2.3 (bc3d9e1)
  ロールバック先: v1.2.2 (f96da07)
  戦略: Blue-Green (トラフィック切り替え)

手順:
1. Blue環境 (v1.2.2) をアクティブ化
2. トラフィック切り替え (Green → Blue)
3. ヘルスチェック実行
4. Green環境 (v1.2.3) 停止

予想ダウンタイム: 30秒
予想所要時間: 1分

実行する場合: /deploy-rollback production
```

## ロールバック戦略

### Blue-Green Deployment
最速のロールバック（数秒）：

```
現在: Green (v1.2.3) ← 100% トラフィック
待機: Blue (v1.2.2) ← 0% トラフィック
    ↓ ロールバック
現在: Green (v1.2.3) ← 0% トラフィック
復帰: Blue (v1.2.2) ← 100% トラフィック
```

### Rolling Update
段階的にロールバック（1-2分）：

```
現在: [V1.2.3] [V1.2.3] [V1.2.3]
        ↓
      [V1.2.2] [V1.2.3] [V1.2.3]
        ↓
      [V1.2.2] [V1.2.2] [V1.2.3]
        ↓
復帰: [V1.2.2] [V1.2.2] [V1.2.2]
```

## ロールバック可能なバージョン

デプロイ履歴から選択可能：

```bash
# ロールバック可能なバージョン一覧
/deploy-status production --history

出力:
#45 v1.2.3 (bc3d9e1) - 現在 ✗
#44 v1.2.2 (f96da07) - ロールバック可能 ✓
#43 v1.2.1 (d209711) - ロールバック可能 ✓
#42 v1.2.0 (614ce57) - ロールバック可能 ✓
#41 v1.1.9 (dac4303) - ロールバック可能 ✓
```

## 自動ロールバック

デプロイ後のヘルスチェックで失敗した場合、自動的にロールバック：

```
[4/6] ヘルスチェック中...
  ✗ API: 500 Internal Server Error
  ✗ Database: Connection timeout

⚠️  ヘルスチェック失敗 - 自動ロールバック開始

[1/3] ロールバック準備中...
  ✓ 前バージョン (v1.2.2) 確認完了

[2/3] トラフィック切り替え中...
  ✓ v1.2.2 に切り替え完了

[3/3] ヘルスチェック中...
  ✓ API: 200 OK
  ✓ Database: Connected

✓ 自動ロールバック完了

デプロイ失敗理由:
  - Health check failed
  - API returned 500 errors
  - Database connection timeout

ログ: .ai/logs/deploy-rollback-2025-12-04.log
```

## ロールバック後の確認

### 動作確認
```bash
# ヘルスチェック
curl https://app.example.com/health

# エンドポイント確認
curl https://app.example.com/api/status
```

### ログ確認
```bash
# 最新ログ確認
/logs --environment=production --tail=100

# エラーログ確認
/logs --environment=production --level=error
```

### 監視
```bash
# リアルタイム監視
/deploy-status production --watch
```

## トラブルシューティング

### ロールバックに失敗

```
Error: Rollback failed

原因:
1. イメージが見つからない
2. ネットワークエラー
3. リソース不足

解決策:
# 強制ロールバック
/deploy-rollback production --force

# または手動で対応
# 1. ECS/Kubernetesコンソールで手動切り替え
# 2. 前のタスク定義を使用
```

### ロールバック後もエラーが続く

```
Error: Service still unhealthy after rollback

原因:
1. データベースマイグレーションの問題
2. 環境変数の変更
3. 外部サービスの障害

解決策:
# さらに前のバージョンにロールバック
/deploy-rollback production --version=v1.2.1

# またはデータベースをロールバック
# (マイグレーションのdownスクリプト実行)
```

### イメージが見つからない

```
Error: Image not found: ccagi:prod-f96da07

原因: イメージが削除されている

解決策:
# イメージを再ビルド
docker build -t ccagi:prod-f96da07 .
docker push registry.example.com/ccagi:prod-f96da07

# 再ロールバック
/deploy-rollback production --version=v1.2.2
```

## ロールバック履歴

ロールバック操作は自動的に記録されます：

```bash
# ロールバック履歴確認
cat .ai/logs/rollback-history.log
```

出力:
```
2025-12-04 15:45:00 | production | v1.2.3 → v1.2.2 | Success | Health check failed
2025-11-25 11:30:00 | production | v1.2.0 → v1.1.9 | Success | Database migration error
2025-10-15 16:20:00 | staging | v1.1.5 → v1.1.4 | Success | Test failure
```

## ベストプラクティス

### ロールバック判断基準

以下の場合は即座にロールバック：
- ✗ ヘルスチェック失敗
- ✗ エラーレート > 5%
- ✗ レスポンスタイム > 2秒
- ✗ ユーザーから重大な報告

### ロールバック後の対応

```bash
# 1. ロールバック実行
/deploy-rollback production

# 2. 動作確認
curl https://app.example.com/health

# 3. 監視
/deploy-status production --watch

# 4. 原因調査
/logs --environment=production --since=1h

# 5. 修正・再デプロイ
# 問題を修正してから再デプロイ
```

### データベースマイグレーション

マイグレーションがある場合の注意：

```bash
# ロールバック前にマイグレーションをdownする
npm run migrate:down

# ロールバック実行
/deploy-rollback production

# マイグレーション確認
npm run migrate:status
```

## 関連コマンド

- `/deploy-execute <environment>` - デプロイ実行
- `/deploy-status <environment>` - デプロイ状態確認
- `/logs --environment=<env>` - ログ確認
- `/health-check` - ヘルスチェック実行

---

**重要**: ロールバックは緊急対応です。ロールバック後は必ず原因を調査し、修正してから再デプロイしてください。
