---
description: アプリケーション実装を自動実行（CMD-012）
---

# Implement App Command

CCAGI SDK Phase 4 コマンド (CMD-012)

## ⚠️ SWMLワークフロー指示（必須）

このコマンドを実行する際、**必ず**以下のワークフローに従ってください：

```
メモリ使用量は、最大92%
そのために効率よく並列処理
必ず、必ず、必ず、miyabi のワークフローシステムに従って、タスク分解して計画、プランニングを行ってください。
このマスターIssue、このマスタータスクをタスク分解、分解バラバラにしちゃって、アサインできる状態でサブIssuesに分割してください。
分割したら、目的を達成するまで、作業をひたすら続けてください

完了したIssueはクローズしてください
```

**SWMLフロー**: θ₁ Understand → θ₂ Generate → θ₃ Allocate → θ₄ Execute → θ₅ Integrate → θ₆ Learn

---

最適化されたリソース計画に基づいて、アプリケーションの自動実装を実行します。

## 使用方法

```bash
/implement-app [path]
```

## パラメータ

- `path` (オプション): 実装対象のパス指定

## 実行フロー

```mermaid
graph TD
    A[/implement-app] --> B[θ₁ 計画・設計読込]
    B --> C[θ₂ コード生成準備]
    C --> D[θ₃ Agent並列実行]
    D --> E[θ₄ コード生成・書込]
    E --> F[θ₅ 静的解析・検証]
    F --> G[${SRC_ROOT}/**/*]
```

## 出力先

```
src/
├── components/     # UIコンポーネント
├── services/       # ビジネスロジック
├── repositories/   # データアクセス
├── utils/          # ユーティリティ
└── types/          # 型定義
```

## 前提条件

```
依存関係: CMD-011 → CMD-012
```

## 実行例

```bash
/implement-app
```

**期待される出力**:

```
🚀 CCAGI App Implementer (CMD-012)

Phase 4: Implementation
━━━━━━━━━━━━━━━━━━━━━━━━

θ₁ Understanding...
   ✅ プロジェクト計画読込
   ✅ リソース最適化読込
   📊 実装対象: 48タスク

θ₂ Generating...
   ✅ コードテンプレート準備
   🔄 依存関係解決中...

θ₃ Allocating...
   ⚡ CodeGenAgent-1: 認証モジュール
   ⚡ CodeGenAgent-2: ユーザーモジュール
   ⚡ CodeGenAgent-3: データモジュール

θ₄ Executing...
   [████████████████████] 100%
   📦 src/services/auth.ts
   📦 src/services/user.ts
   📦 src/services/data.ts
   📦 src/components/Login.tsx
   ... (45 more files)

θ₅ Integrating...
   ✅ TypeScript: 0 errors
   ✅ ESLint: 0 errors
   ✅ 静的解析: PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Implementation Complete

生成ファイル: 48
総行数: 4,235
実行時間: 180s

次のステップ:
  /optimize-design  # UI/UX最適化
  /run-test unit    # 単体テスト実行
```

## 生成コードの特徴

### TypeScript strict mode

```typescript
// 生成されるコードはstrict mode完全対応
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Docker E2E統合

```yaml
instructions:
  - SWML_WORKFLOW  # θ₁-θ₆処理
  - DOCKER_E2E     # Docker環境でのE2E
```

## 並列実行アーキテクチャ

```
┌─────────────────────────────────────────┐
│           CoordinatorAgent               │
│  ┌─────────────────────────────────────┐ │
│  │     Parallel Execution Engine       │ │
│  └─────────────────────────────────────┘ │
│         ↓           ↓           ↓        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │CodeGen-1 │ │CodeGen-2 │ │CodeGen-3 │ │
│  │ 認証系   │ │ユーザー系 │ │ データ系 │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│         ↓           ↓           ↓        │
│  ┌─────────────────────────────────────┐ │
│  │     Result Integration & Merge      │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 依存関係

**依存元**: CMD-011 (optimize-resources)
**依存先**: CMD-013 (optimize-design), CMD-014~017 (tests)

## 関連コマンド

- [/optimize-resources](./optimize-resources.md) (CMD-011)
- [/optimize-design](./optimize-design.md) (CMD-013)
- [/run-test](./run-test.md) (CMD-014~017)

---

## 実行時の指示（Claude向け）

このコマンドを実行する際、必ず以下のGitHub Issue連携を行ってください：

### ⚠️ 重要: Phase Issue作成は必須

**Phase Issueが作成されない場合、このコマンドは失敗とみなされます。**

実行時に必ず以下を確認してください：
1. Phase 4 Issueが存在するか確認
2. 存在しない場合は**必ず作成**
3. 作成後、Issue URLをユーザーに報告

### Step 1: SSOT Issue・Phase 4 Issue取得

`.ccagi.yml` からIssue番号を取得：

```bash
SSOT_ISSUE=$(grep 'issue_number' .ccagi.yml 2>/dev/null | awk '{print $2}')
PHASE4_ISSUE=$(grep 'phase4' .ccagi.yml 2>/dev/null | awk '{print $2}')
```

### Step 1.5: SSOT Issue作成（存在しない場合）

**SSOT Issueが存在しない場合、自動作成**：

```bash
if [ -z "$SSOT_ISSUE" ]; then
  # プロジェクト名を取得
  PROJECT_NAME=$(grep 'project_name' .ccagi.yml 2>/dev/null | awk '{print $2}' | tr -d '"')
  if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME=$(basename "$(pwd)")
  fi

  echo "📋 SSOT Issue が未設定のため、自動作成します..."

  SSOT_ISSUE=$(gh issue create \
    --title "[SSOT] ${PROJECT_NAME} - Document Registry" \
    --body "$(cat <<'EOF'
# 📋 SSOT Document Registry

このIssueはプロジェクトの全ドキュメントへのリンクと進捗を管理します。

## 📊 進捗状況

| Phase | Status | Issue | Updated |
|-------|--------|-------|---------|
| Phase 1: Requirements | ⏭️ skipped | - | - |
| Phase 2: Design | ⏭️ skipped | - | - |
| Phase 3: Planning | ⏭️ skipped | - | - |
| Phase 4: Implementation | 🔄 | - | $(date '+%Y-%m-%d') |
| Phase 5: Testing | ⏳ | - | - |
| Phase 6: Documentation | ⏳ | - | - |
| Phase 7: Deployment | ⏳ | - | - |
| Phase 8: Platform | ⏳ | - | - |

## 📁 生成ドキュメント

### Phase 1: Requirements
<!-- PHASE_1_DOCS -->

### Phase 2: Design
<!-- PHASE_2_DOCS -->

### Phase 3: Planning
<!-- PHASE_3_DOCS -->

### Phase 4: Implementation
<!-- PHASE_4_DOCS -->

### Phase 5: Testing
<!-- PHASE_5_DOCS -->

### Phase 6: Documentation
<!-- PHASE_6_DOCS -->

### Phase 7: Deployment
<!-- PHASE_7_DOCS -->

### Phase 8: Platform
<!-- PHASE_8_DOCS -->

## 💬 フィードバック

フィードバックはこのIssueのコメントとして記録されます。

---
🤖 Generated by CCAGI SDK (auto-created from /implement-app)
EOF
)" \
    --label "SSOT,🤖 automated" | grep -oE '[0-9]+$')

  echo "✅ SSOT Issue #${SSOT_ISSUE} を作成しました"

  # .ccagi.yml にSST設定を追加
  if grep -q "^ssot:" .ccagi.yml 2>/dev/null; then
    sed -i '' "s/issue_number:.*/issue_number: ${SSOT_ISSUE}/" .ccagi.yml
  else
    cat >> .ccagi.yml <<EOF

# ========================================
# SSOT (Single Source of Truth) 設定
# ========================================
ssot:
  issue_number: ${SSOT_ISSUE}
  project_name: "${PROJECT_NAME}"
  created_at: "$(date '+%Y-%m-%d')"
  created_by: "/implement-app"
EOF
  fi
fi
```

### Step 2: Phase 4 Issue作成（存在しない場合）

Phase 4 Issueが存在しない場合、**必ず**作成：

```bash
if [ -z "$PHASE4_ISSUE" ]; then
  PHASE4_ISSUE=$(gh issue create \
    --title "🚀 Phase 4: 実装 - #${SSOT_ISSUE}" \
    --body "$(cat <<EOF
親Issue: #${SSOT_ISSUE}

## 🚀 Phase 4: Implementation

実装フェーズの作業を管理します。

## タスク

- [ ] コード生成準備
- [ ] Agent並列実行
- [ ] コード生成・書込
- [ ] 静的解析・検証

## 生成ファイル

- src/components/
- src/services/
- src/repositories/
- src/utils/
- src/types/

## 依存関係

- **依存元**: Phase 3 (Planning)
- **依存先**: Phase 5 (Testing)

---
🤖 Generated by CCAGI SDK
EOF
)" \
    --label "phase:implementation,🤖 automated" | grep -oE '[0-9]+$')

  echo "Phase 4 Issue #${PHASE4_ISSUE} を作成しました"

  # .ccagi.yml に記録
  echo "  phase4: ${PHASE4_ISSUE}" >> .ccagi.yml

  # SSOT Issueにコメント
  gh issue comment ${SSOT_ISSUE} --body "## 🚀 Phase 4: Implementation 開始

Phase 4 Issue: #${PHASE4_ISSUE}

開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
"
fi
```

### Step 2.5: 既存コードポリシーの読み込みと適用

`.ccagi.yml` から既存コードポリシーを読み込み、コード生成時に適用：

```bash
# ポリシー読み込み
EXISTING_FILES_POLICY=$(grep -A1 'existing_files:' .ccagi.yml 2>/dev/null | tail -1 | awk '{print $1}')
BACKUP_ENABLED=$(grep 'backup_before_modify:' .ccagi.yml 2>/dev/null | awk '{print $2}')
BACKUP_DIR=$(grep 'backup_directory:' .ccagi.yml 2>/dev/null | awk '{print $2}' | tr -d '"')

# デフォルト値設定
EXISTING_FILES_POLICY=${EXISTING_FILES_POLICY:-patch}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
BACKUP_DIR=${BACKUP_DIR:-.ccagi-backup}

echo "📋 既存コードポリシー:"
echo "   - 既存ファイル: ${EXISTING_FILES_POLICY}"
echo "   - バックアップ: ${BACKUP_ENABLED}"
echo "   - バックアップ先: ${BACKUP_DIR}"
```

**ポリシー適用ルール**:

| ポリシー | 動作 |
|---------|------|
| `patch` | 既存ファイルに差分を適用（Edit tool使用） |
| `overwrite` | 既存ファイルを上書き（Write tool使用） |
| `skip` | 既存ファイルは変更しない |

**保護ファイルチェック**:

```bash
# 保護パターンに該当するファイルは変更しない
PROTECTED_PATTERNS=(
  "*.config.*"
  "package.json"
  "package-lock.json"
  ".env*"
  "tsconfig.json"
  ".ccagi.yml"
  ".gitignore"
)

is_protected() {
  local file="$1"
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$file" == $pattern ]]; then
      echo "⚠️ 保護対象ファイル: $file - 変更スキップ"
      return 0
    fi
  done
  return 1
}
```

**バックアップ処理**:

```bash
backup_file() {
  local file="$1"
  if [ "$BACKUP_ENABLED" = "true" ] && [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR"
    local backup_path="${BACKUP_DIR}/$(date '+%Y%m%d-%H%M%S')-$(basename "$file")"
    cp "$file" "$backup_path"
    echo "💾 バックアップ: $file → $backup_path"
  fi
}
```

**大幅変更チェック**:

```bash
MAJOR_CHANGE_THRESHOLD=50

check_major_change() {
  local file="$1"
  local new_content="$2"

  if [ -f "$file" ]; then
    local diff_lines=$(diff <(cat "$file") <(echo "$new_content") | wc -l)
    if [ "$diff_lines" -gt "$MAJOR_CHANGE_THRESHOLD" ]; then
      echo "⚠️ 大幅変更検出: $file (${diff_lines}行変更)"
      echo "   → ReviewAgentによるレビューが必要です"
      return 1
    fi
  fi
  return 0
}
```

### Step 3: 実装進捗をPhase 4 Issueに報告

```bash
if [ -n "$PHASE4_ISSUE" ]; then
  gh issue comment ${PHASE4_ISSUE} --body "## 🔄 実装進捗

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### 生成ファイル
- 生成ファイル数: XX
- 総行数: X,XXX

### 品質チェック
- TypeScript: 0 errors
- ESLint: 0 errors
- 静的解析: PASS
"
fi
```

### Step 4: Phase 4完了時

全ての実装が完了したら：

```bash
# Phase 4 Issueをクローズ
gh issue close ${PHASE4_ISSUE} --comment "✅ Phase 4 完了 - 実装が完了しました"

# SSOT Issueを更新
gh issue comment ${SSOT_ISSUE} --body "## ✅ Phase 4: Implementation 完了

完了時刻: $(date '+%Y-%m-%d %H:%M:%S')

### 生成ファイル
- 生成ファイル数: XX
- 総行数: X,XXX

### 次のステップ
\`/test\` を実行してPhase 5を開始
"
```

### Step 5: 完了報告

ユーザーに以下を報告：
- 生成されたファイル一覧
- **Phase 4 Issue URL**
- **SSOT Issue URL**
- 次のステップ

---

🤖 CCAGI SDK v6.21.5 - Phase 4: Implementation (CMD-012)
