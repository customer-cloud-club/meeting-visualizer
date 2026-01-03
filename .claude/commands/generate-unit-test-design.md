---
description: ユニットテスト設計書を自動生成（CMD-006）
---

# Generate Unit Test Design Command

CCAGI SDK Phase 2 コマンド (CMD-006)

データフロー図から単体テスト設計書を自動生成します。

## 使用方法

```bash
/generate-unit-test-design [path]
```

## パラメータ

- `path` (オプション): 追加のコンテキストファイルパス

## 実行フロー

```mermaid
graph TD
    A[/generate-unit-test-design] --> B[θ₁ DFD・要件読込]
    B --> C[θ₂ テストケース抽出]
    C --> D[θ₃ テストカテゴリ分類]
    D --> E[θ₄ 設計書生成]
    E --> F[θ₅ カバレッジ分析]
    F --> G[${TEST_DESIGNS}/unit-test-design.md]
```

## 出力先

```
docs/test-designs/unit-test-design.md
```

## 前提条件

```
依存関係: CMD-005 → CMD-006
```

## 実行例

```bash
/generate-unit-test-design
```

**期待される出力**:

```
🧪 CCAGI Unit Test Design Generator (CMD-006)

Phase 2: Design - Unit Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ データフロー図読込
   ✅ 機能要件マッピング
   🔍 テスト対象関数: 45個

θ₂ Generating...
   ✅ 正常系テストケース: 45件
   ✅ 異常系テストケース: 68件
   ✅ 境界値テストケース: 32件

θ₃ Allocating...
   ✅ Auth Module: 15テスト
   ✅ User Module: 28テスト
   ✅ Data Module: 52テスト
   ✅ Util Module: 50テスト

θ₄ Executing...
   📝 unit-test-design.md 生成

θ₅ Integrating...
   ✅ 要件カバレッジ: 95%
   ✅ コードカバレッジ予測: 85%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Unit Test Design Generated

出力: docs/test-designs/unit-test-design.md
テストケース数: 145
実行時間: 35s
```

## 出力形式

### unit-test-design.md

````markdown
# 単体テスト設計書

## 概要

| 項目 | 値 |
|------|-----|
| テストケース総数 | 145 |
| 正常系 | 45 |
| 異常系 | 68 |
| 境界値 | 32 |
| カバレッジ目標 | 80% |

---

## UT-001: UserService.authenticate

### テスト対象
```typescript
async authenticate(email: string, password: string): Promise<User>
```

### テストケース

| ID | 分類 | 入力 | 期待結果 |
|----|------|------|----------|
| UT-001-01 | 正常系 | 有効なemail/password | User オブジェクト |
| UT-001-02 | 異常系 | 無効なemail | AuthenticationError |
| UT-001-03 | 異常系 | 無効なpassword | AuthenticationError |
| UT-001-04 | 異常系 | 空のemail | ValidationError |
| UT-001-05 | 境界値 | 最大長email | User オブジェクト |

### モック設定
```typescript
vi.mock('@/repositories/UserRepository', () => ({
  findByEmail: vi.fn(),
}));
```

### テストコード例
```typescript
describe('UserService.authenticate', () => {
  it('should return user for valid credentials', async () => {
    const result = await userService.authenticate('test@example.com', 'password');
    expect(result).toBeInstanceOf(User);
  });
});
```
````

## 依存関係

**依存元**: CMD-005 (dataflow-diagram)
**依存先**: CMD-014 (run-unit-test)

## テスト戦略

```yaml
strategies:
  - AAA Pattern (Arrange-Act-Assert)
  - Mock/Stub for external dependencies
  - Boundary value analysis
  - Equivalence partitioning
```

## 関連コマンド

- [/generate-integration-test-design](./generate-integration-test-design.md) (CMD-007)
- [/run-unit-test](./run-unit-test.md) (CMD-014)

---

🤖 CCAGI SDK v6.15.0 - Phase 2: Design (CMD-006)
