---
description: UI/UXデザイン最適化を実行（CMD-013）
---

# Optimize Design Command

CCAGI SDK Phase 4 コマンド (CMD-013)

実装されたアプリケーションのUI/UXを最適化します。

## 使用方法

```bash
/optimize-design
```

## 実行フロー

```mermaid
graph TD
    A[/optimize-design] --> B[θ₁ 実装コード読込]
    B --> C[θ₂ UI/UX分析]
    C --> D[θ₃ 改善点特定]
    D --> E[θ₄ 最適化適用]
    E --> F[θ₅ 視覚的検証]
    F --> G[ui-ux-improvement status]
```

## 出力

```
status: ui-ux-improvement
```

## 前提条件

```
依存関係: CMD-012 → CMD-013
```

## 実行例

```bash
/optimize-design
```

**期待される出力**:

```
🎨 CCAGI Design Optimizer (CMD-013)

Phase 4: Implementation - UI/UX Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ コンポーネント分析: 24個
   ✅ スタイル分析: 18ファイル

θ₂ Generating...
   🔍 アクセシビリティチェック
   🔍 レスポンシブ分析
   🔍 パフォーマンス分析

θ₃ Allocating...
   ⚠️ コントラスト不足: 3箇所
   ⚠️ タッチターゲット小: 5箇所
   ⚠️ LCP改善候補: 2箇所

θ₄ Executing...
   ✅ コントラスト修正
   ✅ ボタンサイズ調整
   ✅ 画像遅延読込追加
   ✅ CSS最適化

θ₅ Integrating...
   ✅ Lighthouse Score: 85 → 95
   ✅ アクセシビリティ: AA準拠
   ✅ レスポンシブ: 全デバイス対応

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Design Optimization Complete

状態: ui-ux-improvement
改善項目: 10
Lighthouse改善: +10pt

次のステップ:
  /run-test unit  # 単体テスト実行
```

## 最適化項目

### アクセシビリティ

```yaml
a11y:
  - contrast_ratio: 4.5:1
  - focus_indicators: visible
  - aria_labels: complete
  - keyboard_navigation: supported
```

### パフォーマンス

```yaml
performance:
  - lazy_loading: images, components
  - code_splitting: enabled
  - bundle_optimization: tree-shaking
  - caching_strategy: configured
```

### レスポンシブ

```yaml
responsive:
  breakpoints:
    - mobile: 320px
    - tablet: 768px
    - desktop: 1024px
    - large: 1440px
  touch_targets: 44px minimum
```

## Docker E2E統合

```yaml
instructions:
  - SWML_WORKFLOW
  - DOCKER_E2E  # Docker環境で視覚テスト
```

## 依存関係

**依存元**: CMD-012 (implement-app)
**依存先**: なし（並列でテスト実行可能）

## 関連コマンド

- [/implement-app](./implement-app.md) (CMD-012)
- [/run-test](./run-test.md) (CMD-014~017)

---

🤖 CCAGI SDK v6.15.0 - Phase 4: Implementation (CMD-013)
