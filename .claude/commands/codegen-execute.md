---
description: コード生成実行 - CodeGenAgentを起動
---

# /codegen-execute - コード生成実行

CodeGenAgentを実行して、Issueに基づいたコードを自動生成します。

## 使い方

```bash
# Issue番号でコード生成
/codegen-execute 887

# 詳細モード
/codegen-execute 887 --verbose

# ドライラン（生成内容のプレビュー）
/codegen-execute 887 --dry-run
```

## 機能

1. **Issue分析**
   - Issue内容の解析
   - 要件の抽出
   - 設計方針の決定

2. **コード生成**
   - TypeScript/JavaScript コード生成
   - テストコード生成
   - ドキュメント生成

3. **品質保証**
   - TypeScriptコンパイルチェック
   - ESLintチェック
   - テスト実行

## 実行フロー

```
Issue読み込み
    ↓
要件分析
    ↓
設計検討
    ↓
コード生成
    ↓
テスト生成
    ↓
品質チェック
    ↓
完了
```

## 関連コマンド

- `/agent-run --issue <number>` - 統合Agent実行
- `/review-execute <issue>` - 品質チェック実行
- `/pr-create <issue>` - PR作成
