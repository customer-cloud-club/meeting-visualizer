---
description: 結合テスト設計書を自動生成（CMD-007）
---

# Generate Integration Test Design Command

CCAGI SDK Phase 2 コマンド (CMD-007)

シーケンス図から結合テスト設計書を自動生成します。

## 使用方法

```bash
/generate-integration-test-design [path]
```

## パラメータ

- `path` (オプション): 追加のコンテキストファイルパス

## 実行フロー

```mermaid
graph TD
    A[/generate-integration-test-design] --> B[θ₁ シーケンス図読込]
    B --> C[θ₂ インターフェース抽出]
    C --> D[θ₃ テストシナリオ構築]
    D --> E[θ₄ 設計書生成]
    E --> F[θ₅ カバレッジ分析]
    F --> G[${TEST_DESIGNS}/integration-test-design.md]
```

## 出力先

```
docs/test-designs/integration-test-design.md
```

## 前提条件

```
依存関係: CMD-003 → CMD-007
```

## 実行例

```bash
/generate-integration-test-design
```

**期待される出力**:

```
🔗 CCAGI Integration Test Design Generator (CMD-007)

Phase 2: Design - Integration Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ シーケンス図読込: 12フロー
   🔍 コンポーネント間接続: 24ポイント

θ₂ Generating...
   ✅ API連携テスト: 18件
   ✅ DB連携テスト: 12件
   ✅ 外部サービス連携テスト: 8件

θ₃ Allocating...
   ✅ Auth Flow: 6テスト
   ✅ User Flow: 10テスト
   ✅ Data Flow: 14テスト
   ✅ External Flow: 8テスト

θ₄ Executing...
   📝 integration-test-design.md 生成

θ₅ Integrating...
   ✅ フローカバレッジ: 100%
   ✅ インターフェースカバレッジ: 92%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Integration Test Design Generated

出力: docs/test-designs/integration-test-design.md
テストケース数: 38
実行時間: 32s
```

## 出力形式

### integration-test-design.md

````markdown
# 結合テスト設計書

## 概要

| 項目 | 値 |
|------|-----|
| テストケース総数 | 38 |
| API連携 | 18 |
| DB連携 | 12 |
| 外部連携 | 8 |

---

## IT-001: ユーザー認証フロー

### 対象シーケンス
SD-001: ユーザー認証フロー

### テストシナリオ

| ID | シナリオ | 関連コンポーネント | 期待結果 |
|----|----------|-------------------|----------|
| IT-001-01 | 正常ログイン | Frontend→API→DB | セッション確立 |
| IT-001-02 | 認証失敗 | Frontend→API | 401エラー |
| IT-001-03 | トークン更新 | API→Auth | 新トークン発行 |

### テスト環境
```yaml
services:
  - postgres:15
  - redis:7
environment:
  DATABASE_URL: postgresql://test@localhost/test
  REDIS_URL: redis://localhost:6379
```

### テストコード例
```typescript
describe('User Authentication Flow', () => {
  it('should complete login flow', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```
````

## 依存関係

**依存元**: CMD-003 (sequence-diagram)
**依存先**: CMD-015 (run-integration-test)

## 関連コマンド

- [/generate-unit-test-design](./generate-unit-test-design.md) (CMD-006)
- [/generate-gui-test-design](./generate-gui-test-design.md) (CMD-008)

---

🤖 CCAGI SDK v6.15.0 - Phase 2: Design (CMD-007)
