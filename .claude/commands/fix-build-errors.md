---
description: TypeScriptビルドエラー自動修正 - 型エラーを分析・分類・修正
---

# TypeScriptビルドエラー自動修正

TypeScriptのビルドエラーを体系的に分析し、自動修正します。

## ワークフロー概要

```
1. ビルド実行 → エラー収集
2. エラー分類（カテゴリ別）
3. 型定義確認（インターフェース読み込み）
4. 修正計画作成（TodoWrite）
5. 順次修正実行
6. ビルド再実行で検証
```

## Phase 1: エラー収集・分析

### 1.1 ビルド実行

```bash
npm run build 2>&1 | tee /tmp/build-errors.log
```

### 1.2 エラー分類

| カテゴリ | パターン | 対処法 |
|---------|---------|--------|
| **型不一致** | `Property 'X' does not exist on type 'Y'` | 型アサーション追加 or インターフェース修正 |
| **モジュール未解決** | `Cannot find module 'X'` | 依存関係インストール |
| **パラメータ型** | `Argument of type 'X' is not assignable` | 関数シグネチャ修正 |
| **比較エラー** | `This comparison appears to be unintentional` | 型注釈追加 |
| **インターフェース不一致** | `Object literal may only specify known properties` | プロパティ追加/削除 |

## Phase 2: 型定義確認

### 2.1 関連インターフェースの読み込み

エラーファイルが参照する型定義を確認:

```bash
# 型定義ファイルを特定
grep -r "interface\|type" src/**/*.ts | grep -i "エラーに含まれる型名"
```

### 2.2 型定義の比較

**期待される型** と **実際の使用** を比較し、差分を特定。

## Phase 3: 修正パターン

### 3.1 プロパティ不一致

**Before:**
```typescript
// CommandContext に workingDir が存在しない
const context: CommandContext = {
  projectRoot: '/path',
  workingDir: '/path',  // ❌ エラー
};
```

**After:**
```typescript
// 正しいプロパティ名を使用
const context: CommandContext = {
  projectRoot: '/path',
  outputDir: '/path/output',  // ✅ 修正
};
```

### 3.2 結果プロパティ不一致

**Before:**
```typescript
if (result.success) {  // ❌ success は存在しない
  // ...
}
```

**After:**
```typescript
if (result.status === 'completed') {  // ✅ 正しいプロパティ
  // ...
}
```

### 3.3 モック関数の型修正

**Before:**
```typescript
vi.spyOn(global, 'execSync' as any).mockImplementation((cmd: string) => {
  // ❌ パラメータ型が不一致
});
```

**After:**
```typescript
vi.spyOn(global, 'execSync' as any).mockImplementation((...args: unknown[]) => {
  const cmd = args[0] as string;  // ✅ 適切な型キャスト
});
```

### 3.4 リテラル型の比較

**Before:**
```typescript
const expected = 'abc123';  // ❌ リテラル型
const actual = 'xyz789';    // ❌ リテラル型
const match = expected === actual;  // 型エラー
```

**After:**
```typescript
const expected: string = 'abc123';  // ✅ 通常の文字列型
const actual: string = 'xyz789';    // ✅ 通常の文字列型
const match = expected === actual;  // OK
```

### 3.5 動的プロパティアクセス

**Before:**
```typescript
expect(result.data?.ready).toBe(true);  // ❌ data の型が {}
```

**After:**
```typescript
expect((result.data as any)?.ready).toBe(true);  // ✅ 型アサーション
```

### 3.6 モジュール未解決

```bash
# 不足している依存関係をインストール
npm install モジュール名 --save-dev

# 型定義も必要な場合
npm install @types/モジュール名 --save-dev
```

## Phase 4: 修正実行

### 4.1 TodoWriteで計画作成

各エラーファイルごとにタスクを作成し、進捗を追跡。

### 4.2 優先順位

1. **モジュール未解決** → npm install で解決
2. **インターフェース不一致** → 型定義の確認・修正
3. **プロパティ不存在** → 正しいプロパティ名に変更
4. **パラメータ型不一致** → 型キャスト追加
5. **比較エラー** → 型注釈追加

### 4.3 検証

```bash
# 修正後に再ビルド
npm run build

# 成功確認
echo $?  # 0 なら成功
```

## チェックリスト

### 修正前
- [ ] ビルドエラーログを取得
- [ ] エラーを分類
- [ ] 関連する型定義を読み込み
- [ ] 修正計画を作成

### 修正中
- [ ] TodoWriteでタスク追跡
- [ ] 各ファイルを順次修正
- [ ] 部分ビルドで確認

### 修正後
- [ ] 完全ビルド成功
- [ ] 既存テストがパス
- [ ] 型チェック成功

## よくある修正パターン集

### Commander/Handler パターン

```typescript
// CommandHandlerResult の success → status
result.success  →  result.status === 'completed'
result.success === false  →  result.status === 'failed'

// CommandContext のプロパティ
workingDir  →  outputDir
command  →  (削除)
environment  →  env

// 結果プロパティ
generatedFiles  →  artifacts
```

### Vitest モック パターン

```typescript
// spyOn の型安全なモック
vi.spyOn(object, 'method' as any).mockImplementation((...args: unknown[]) => {
  const arg1 = args[0] as ExpectedType;
  // ...
});
```

### 型アサーション パターン

```typescript
// 動的プロパティへのアクセス
(object as any).dynamicProperty
(result.data as SomeType)?.property
```

## 実行例

```bash
# 1. 現在のエラー確認
npm run build

# 2. エラー数確認
npm run build 2>&1 | grep "error TS" | wc -l

# 3. 修正後の確認
npm run build && echo "✅ ビルド成功" || echo "❌ まだエラーあり"
```

---

## 自動復旧失敗時のサポートIssue起票

自動修正を3回試行しても解決できない場合、**必ず**サポートIssueを自動作成：

### サポートIssue自動起票条件

- 3回の自動修正試行後もビルドエラーが解消されない
- 未知のエラーパターンを検出
- 型定義の根本的な不整合を検出

### Issue作成コマンド

```bash
gh issue create \
  --title "🆘 ビルドエラー自動修正失敗 - $(date '+%Y-%m-%d %H:%M')" \
  --body "$(cat <<'EOF'
## 問題概要

自動修正を3回試行しましたが、以下のエラーを解消できませんでした。

## 環境情報

- Node.js: $(node -v)
- TypeScript: $(npx tsc --version)
- OS: $(uname -a)

## エラーログ

\`\`\`
$(cat /tmp/build-errors.log | tail -100)
\`\`\`

## 試行した修正内容

1. 修正1: <内容>
2. 修正2: <内容>
3. 修正3: <内容>

## 再現手順

1. リポジトリをクローン
2. \`npm install\`
3. \`npm run build\`

## 関連ファイル

- <エラーが発生しているファイルパス>

---
🤖 自動生成されたサポートIssue
EOF
)" \
  --label "bug,🆘 support,🤖 automated"

echo "📋 サポートIssue #XX を作成しました"
echo "エンジニアに通知が送信されます"
```

---

このワークフローに従うことで、TypeScriptビルドエラーを体系的に修正できます。
自動修正が失敗した場合はサポートIssueが自動起票されます。
