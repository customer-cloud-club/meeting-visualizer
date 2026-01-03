# AWS Organization Status Check

AWS Organization全体の状態を一元的に確認してください。

## 確認項目

### 1. 💰 コスト状況（最優先）

管理アカウント（profile: admin）で以下を確認：

```bash
# Organization全体のBudget状況
aws budgets describe-budgets \
  --account-id 211234825975 \
  --region us-east-1 \
  --profile admin \
  --query 'Budgets[*].[BudgetName,BudgetLimit.Amount,CalculatedSpend.ActualSpend.Amount,TimeUnit]' \
  --output table

# 今月のコスト詳細
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -v1d +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --region us-east-1 \
  --profile admin \
  --query 'ResultsByTime[*].[TimePeriod.Start,Total.UnblendedCost.Amount]' \
  --output table
```

**報告形式**:
- 現在のコスト: $XXX.XX / $1,000.00 (XX%)
- 状態: 🟢 正常 / 🟡 警告 / 🔴 超過
- 前月比: +XX% / -XX%

---

### 2. ⚠️ セキュリティ状況

#### GuardDuty 脅威検出

```bash
# アクティブな脅威（直近7日間）
aws guardduty list-findings \
  --detector-id f2cd3b0fc8d9616ccf0f63fd3f95daac \
  --finding-criteria '{"Criterion":{"updatedAt":{"Gte":'$(date -u -v-7d +%s)000'},"severity":{"Gte":4}}}' \
  --region us-east-1 \
  --profile admin \
  --max-items 10

# 高重大度の脅威詳細
aws guardduty get-findings \
  --detector-id f2cd3b0fc8d9616ccf0f63fd3f95daac \
  --finding-ids <FINDING_IDS> \
  --region us-east-1 \
  --profile admin \
  --query 'Findings[*].[Title,Severity,Type,Resource.ResourceType]' \
  --output table
```

#### Security Hub コンプライアンス

```bash
# セキュリティスコア
aws securityhub get-findings \
  --filters '{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"},{"Value":"HIGH","Comparison":"EQUALS"}],"RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}]}' \
  --region us-east-1 \
  --profile admin \
  --max-items 20 \
  --query 'Findings[*].[Title,Severity.Label,Compliance.Status]' \
  --output table
```

**報告形式**:
- GuardDuty: X件の脅威（CRITICAL: X, HIGH: X, MEDIUM: X）
- Security Hub: コンプライアンススコア XX/100
- 未対応の重大な問題: Xリスト

---

### 3. 🏥 AWS Health イベント

```bash
# 進行中のイベント
aws health describe-events \
  --filter eventStatusCodes=open,upcoming \
  --region us-east-1 \
  --profile admin \
  --query 'events[*].[eventTypeCode,service,region,startTime]' \
  --output table

# 最近のイベント（直近7日間）
aws health describe-events \
  --filter eventStatusCodes=closed \
  --max-results 10 \
  --region us-east-1 \
  --profile admin \
  --query 'events[*].[eventTypeCode,service,statusCode,startTime]' \
  --output table
```

**報告形式**:
- 進行中のイベント: X件
- サービス障害: あり/なし
- 予定メンテナンス: X件

---

### 4. 📊 主要リソース状況

#### EC2 インスタンス

```bash
# 全アカウントのEC2インスタンス（メンバーアカウントも確認）
for profile in default admin production; do
  echo "=== Account: $profile ==="
  aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Tags[?Key==`Name`].Value|[0]]' \
    --output table \
    --profile $profile 2>/dev/null || echo "アクセス不可"
done
```

#### RDS データベース

```bash
for profile in default admin production; do
  echo "=== Account: $profile ==="
  aws rds describe-db-instances \
    --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus,Engine]' \
    --output table \
    --profile $profile 2>/dev/null || echo "アクセス不可"
done
```

#### S3 バケット

```bash
# S3バケット数とサイズ（概算）
for profile in default admin production; do
  echo "=== Account: $profile ==="
  aws s3 ls --profile $profile 2>/dev/null | wc -l
done
```

**報告形式**:
- EC2インスタンス: X台稼働中
- RDS: X台稼働中
- S3バケット: X個

---

### 5. 🔔 最近のアラート履歴

```bash
# Lambda実行ログ（最近10件）
aws logs tail /aws/lambda/aifactory-org-cost-alert-to-lark \
  --since 24h \
  --filter-pattern "Lark response status" \
  --region us-east-1 \
  --profile admin \
  | grep "Lark response status" | tail -10

# SNS配信履歴
aws cloudwatch get-metric-statistics \
  --namespace AWS/SNS \
  --metric-name NumberOfMessagesPublished \
  --dimensions Name=TopicName,Value=aifactory-org-cost-alerts \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-1 \
  --profile admin
```

**報告形式**:
- 過去24時間の通知: X件
- 配信成功率: XX%
- エラー: X件

---

## 📊 ダッシュボード形式で報告

以下の形式で見やすくまとめてください：

```
╔════════════════════════════════════════════════════════╗
║  AWS Organization Status Dashboard                     ║
║  Last Updated: 2025-11-12 12:45:00 JST                ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  💰 COST STATUS                                        ║
║  ├─ Current: $XXX.XX / $1,000.00 (XX%)                ║
║  ├─ Status: 🟢 NORMAL                                  ║
║  └─ Trend: ↗️ +15% vs last month                      ║
║                                                        ║
║  ⚠️ SECURITY STATUS                                    ║
║  ├─ GuardDuty: 🟢 No Critical Threats                 ║
║  ├─ Security Hub: 🟡 3 HIGH findings                  ║
║  └─ Compliance Score: 87/100                          ║
║                                                        ║
║  🏥 SERVICE STATUS                                     ║
║  ├─ AWS Health: 🟢 No Active Issues                   ║
║  ├─ Upcoming Maintenance: 1 event                     ║
║  └─ Recent Incidents: 0                               ║
║                                                        ║
║  📊 RESOURCES                                          ║
║  ├─ EC2 Instances: 12 running                         ║
║  ├─ RDS Databases: 3 active                           ║
║  └─ S3 Buckets: 45 total                              ║
║                                                        ║
║  🔔 ALERTS (24h)                                       ║
║  ├─ Total Notifications: 8                            ║
║  ├─ Critical: 0                                       ║
║  ├─ High: 2                                           ║
║  └─ Medium/Low: 6                                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

## ⚠️ アクションが必要な項目

以下の条件に該当する場合、**太字で強調**してください：

- ❌ **コストが80%を超えている**
- ❌ **CRITICAL または HIGH の脅威が存在**
- ❌ **進行中のAWS障害がある**
- ❌ **Security Hubコンプライアンスが70点未満**

---

## 実行頻度の推奨

- **毎朝**: 1日1回の定期確認
- **緊急時**: Lark通知を受けた際の詳細確認
- **週次**: 詳細なコスト分析とトレンド確認
- **月次**: 月初のコスト締めと予算調整

---

**注意**:
- このコマンドは読み取り専用です
- すべてのAWSリソースを変更しません
- エラーが発生した場合はAWS認証情報を確認してください
