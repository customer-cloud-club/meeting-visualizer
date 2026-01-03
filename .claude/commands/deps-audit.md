# 依存関係セキュリティ監査

依存パッケージのセキュリティを監査します。

## 実行

```bash
# npm audit
npm audit

# 詳細レポート
npm audit --json > audit-report.json

# 本番依存のみ
npm audit --production
```

## 脆弱性対応

1. Critical: 即時対応必須
2. High: 24時間以内に対応
3. Moderate: 1週間以内に対応
4. Low: 次回リリースで対応

## 自動修正

```bash
npm audit fix
```
