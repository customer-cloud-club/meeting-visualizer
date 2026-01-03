---
description: E2Eテスト実行（ブラウザテスト実行確認付き）
allowed-tools: Bash, Read, Write, Glob
---

# E2Eテスト実行

End-to-Endテストを実行します。ブラウザテストが実際に実行されたことを確認します。

## 使用方法

```bash
# 全テスト実行
/e2e-test

# 特定のテストのみ
/e2e-test --grep "認証フロー"

# デプロイ環境でテスト
/e2e-test --url https://app.example.com
```

## 実行手順

### Step 1: Playwright/Cypress確認

```bash
# Playwrightの確認
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
  TEST_RUNNER="playwright"
  echo "✅ Playwright検出"
elif [ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ]; then
  TEST_RUNNER="cypress"
  echo "✅ Cypress検出"
else
  echo "❌ E2Eテストランナーが見つかりません"
  echo "→ playwright または cypress をインストールしてください"
  exit 1
fi
```

### Step 2: ブラウザ確認

```bash
# Playwrightの場合
if [ "$TEST_RUNNER" = "playwright" ]; then
  # ブラウザがインストールされているか確認
  if ! npx playwright install --dry-run 2>/dev/null | grep -q "already installed"; then
    echo "📦 ブラウザをインストール中..."
    npx playwright install chromium
  fi
  echo "✅ ブラウザ準備完了"
fi
```

### Step 3: テスト実行

```bash
echo "🧪 E2Eテスト実行中..."
START_TIME=$(date +%s)

if [ "$TEST_RUNNER" = "playwright" ]; then
  # Playwright実行
  npx playwright test --reporter=list 2>&1 | tee e2e-test-output.log
  TEST_EXIT_CODE=${PIPESTATUS[0]}
else
  # Cypress実行
  npx cypress run 2>&1 | tee e2e-test-output.log
  TEST_EXIT_CODE=${PIPESTATUS[0]}
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
```

### Step 4: 実行確認（重要）

ブラウザテストが実際に実行されたか**複数の観点から検証**：

```bash
echo ""
echo "🔍 ブラウザテスト実行検証..."
VERIFICATION_FAILED=0

# 検証1: テスト実行ログを解析
TESTS_RUN=$(grep -E "passed|failed|skipped" e2e-test-output.log | tail -1)

if [ -z "$TESTS_RUN" ]; then
  echo "❌ 検証1失敗: テスト結果が見つかりません"
  VERIFICATION_FAILED=1
else
  echo "✅ 検証1: テスト結果を確認 - $TESTS_RUN"
fi

# 検証2: ブラウザ起動ログ確認
if ! grep -qE "chromium|firefox|webkit|chrome|electron|Launching" e2e-test-output.log; then
  echo "❌ 検証2失敗: ブラウザ起動ログがありません"
  VERIFICATION_FAILED=1
else
  BROWSER_FOUND=$(grep -oE "chromium|firefox|webkit|chrome|electron" e2e-test-output.log | head -1)
  echo "✅ 検証2: ブラウザ起動を確認 - ${BROWSER_FOUND:-unknown}"
fi

# 検証3: 実行時間の閾値チェック（短すぎる場合は警告）
MIN_DURATION=5  # 最低5秒
if [ $DURATION -lt $MIN_DURATION ]; then
  echo "⚠️ 検証3警告: 実行時間が短すぎます (${DURATION}秒 < ${MIN_DURATION}秒)"
  echo "   → テストがスキップされた可能性があります"
  VERIFICATION_FAILED=1
else
  echo "✅ 検証3: 実行時間 - ${DURATION}秒"
fi

# 検証4: スクリーンショット/トレース確認
if [ -d "test-results" ]; then
  SCREENSHOTS=$(find test-results -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
  TRACES=$(find test-results -name "*.zip" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SCREENSHOTS" -gt 0 ] || [ "$TRACES" -gt 0 ]; then
    echo "✅ 検証4: 成果物確認 - スクリーンショット:${SCREENSHOTS}枚, トレース:${TRACES}件"
  else
    echo "⚠️ 検証4: スクリーンショット/トレースがありません（失敗テストなしの場合は正常）"
  fi
else
  echo "ℹ️ 検証4: test-results ディレクトリなし（全テスト成功時は正常）"
fi

# 検証5: テスト数の確認
TEST_COUNT=$(grep -oE "[0-9]+ (passed|test)" e2e-test-output.log | head -1 | grep -oE "[0-9]+")
if [ -z "$TEST_COUNT" ] || [ "$TEST_COUNT" -eq 0 ]; then
  echo "❌ 検証5失敗: 実行テスト数が0です"
  VERIFICATION_FAILED=1
else
  echo "✅ 検証5: 実行テスト数 - ${TEST_COUNT}件"
fi

# 総合判定
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 E2Eテスト結果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$TESTS_RUN"
echo "実行時間: ${DURATION}秒"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $VERIFICATION_FAILED -eq 1 ]; then
  echo ""
  echo "❌ ブラウザテスト検証失敗"
  echo "   以下を確認してください:"
  echo "   1. playwright.config.ts の projects 設定"
  echo "   2. npx playwright install でブラウザがインストールされているか"
  echo "   3. テストファイルが tests/ ディレクトリに存在するか"
  echo ""
  echo "→ ログ詳細: e2e-test-output.log"
  exit 1
fi

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ テスト失敗"
  echo "→ npx playwright show-report でレポートを確認"
  exit 1
else
  echo ""
  echo "✅ 全テスト成功（ブラウザテスト実行確認済み）"
fi
```

### Step 5: レポート生成

```bash
# Playwrightレポート
if [ "$TEST_RUNNER" = "playwright" ]; then
  echo ""
  echo "📄 レポート: npx playwright show-report"

  # スクリーンショット確認
  if [ -d "test-results" ]; then
    SCREENSHOTS=$(find test-results -name "*.png" | wc -l | tr -d ' ')
    echo "📸 スクリーンショット: ${SCREENSHOTS}枚"
  fi
fi
```

## 実行結果の例

```
🧪 E2Eテスト実行中...
✅ ブラウザ準備完了

Running 12 tests using 4 workers

  ✓ auth/login.spec.ts:5:1 › ログインフロー (3.2s)
  ✓ auth/logout.spec.ts:5:1 › ログアウトフロー (1.8s)
  ✓ dashboard/main.spec.ts:8:1 › ダッシュボード表示 (2.1s)
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 E2Eテスト結果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  12 passed (45s)
実行時間: 48秒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 全テスト成功
📄 レポート: npx playwright show-report
📸 スクリーンショット: 3枚
```

## オプション

| オプション | 説明 |
|------------|------|
| `--headed` | ブラウザを表示して実行 |
| `--debug` | デバッグモード |
| `--trace on` | トレース記録 |
| `--grep <pattern>` | 特定テストのみ実行 |
| `--url <url>` | 対象URLを指定 |

## トラブルシューティング

### Q: 「テストが実行されていない」と表示される

```bash
# 確認事項:
1. playwright.config.ts が存在するか
2. tests/ ディレクトリにテストファイルがあるか
3. npm install が完了しているか
```

### Q: ブラウザテストが実行されない

```bash
# Playwrightブラウザをインストール
npx playwright install

# または特定のブラウザのみ
npx playwright install chromium
```

## 関連コマンド

- [/run-gui-test](./run-gui-test.md) - GUIテスト実行
- [/test](./test.md) - 全テスト実行
- [/deploy-dev](./deploy-dev.md) - デプロイ（テスト自動実行付き）

---
🤖 CCAGI SDK - E2E Testing with Browser Verification
