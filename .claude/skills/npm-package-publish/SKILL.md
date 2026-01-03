---
description: npm packageを正確に作成・公開する。パーミッション問題、ファイル漏れを防止。GitHub Release経由での配布対応。
---

# npm Package Publish Skill

npm packageを正確に作成し、GitHub Releaseで配布するためのスキル。

## 使用タイミング

- npm packageを作成・更新するとき
- GitHub Releaseでtarballを配布するとき
- パッケージのファイル漏れを確認するとき

## 実行手順

### Phase 1: パーミッション確認・修正

```bash
# 600パーミッション（他ユーザー読み取り不可）のファイルを検出
find <package-dir> -type f \( -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.ts" -o -name "*.tf" -o -name "*.template" \) ! -perm -044 -ls

# 全て644に修正
find <package-dir> -type f \( -name "*.md" -o -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.ts" -o -name "*.tf" -o -name "*.template" \) ! -perm -044 -exec chmod 644 {} \;
```

### Phase 2: package.json確認

```json
{
  "files": [
    "src",
    "dist",
    "templates",
    "sdk"
  ]
}
```

- `files`フィールドに含めるディレクトリを明示的に指定
- `.npmignore`がある場合は内容を確認

### Phase 3: バージョン更新

```bash
# package.json
"version": "X.Y.Z"

# CLI（ハードコードされている場合）
.version('X.Y.Z')

# 推奨: CLIはpackage.jsonから動的取得
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
const VERSION = packageJson.version;
```

### Phase 4: tarball作成・検証

```bash
cd <package-dir>

# tarball作成
npm pack

# 含まれるファイル数を確認
tar -tzf <package-name>-<version>.tgz | wc -l

# 特定ディレクトリのファイル数比較
echo "Template: $(ls templates/.claude/commands/*.md | wc -l)"
echo "Tarball: $(tar -tzf *.tgz | grep 'commands/.*\.md$' | wc -l)"

# 欠けているファイルを検出
comm -23 \
  <(ls templates/.claude/commands/*.md | sed 's|templates/||' | sort) \
  <(tar -tzf *.tgz | grep 'commands/.*\.md$' | sed 's|package/templates/||' | sort)
```

### Phase 5: GitHub Release作成

```bash
gh release create v<version> \
  <package-name>-<version>.tgz \
  --title "<Package Name> v<version>" \
  --notes "$(cat <<'EOF'
## <Package Name> v<version>

### Changes
- 変更内容

### Install
\`\`\`bash
gh release download v<version> \
  --repo <owner>/<repo> \
  --pattern "*.tgz"

npm install ./<package-name>-<version>.tgz
\`\`\`
EOF
)"
```

## チェックリスト

### リリース前

- [ ] 全ファイルのパーミッションが644以上
- [ ] package.jsonのversionを更新
- [ ] CLIのバージョン表示が動的取得
- [ ] `npm pack`でtarball作成
- [ ] tarball内のファイル数がテンプレートと一致
- [ ] 欠けているファイルがない

### リリース後

- [ ] GitHub Releaseが作成された
- [ ] tarballがダウンロード可能
- [ ] `npm install ./xxx.tgz`が成功
- [ ] インストール後のコマンド/スキルが全て表示される

## よくある問題

### 問題1: ファイルがtarballに含まれない

**原因**: ファイルパーミッションが600（所有者のみ読み取り可能）

**解決**:
```bash
chmod 644 <file>
```

### 問題2: CLIバージョンが古い

**原因**: バージョンがハードコードされている

**解決**:
```javascript
// 動的取得に変更
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
```

### 問題3: プライベートリポジトリからダウンロードできない

**原因**: curlでは認証が必要

**解決**:
```bash
# gh CLIを使用（認証済み）
gh release download v<version> \
  --repo <owner>/<repo> \
  --pattern "*.tgz"
```

## CCAGI SDK固有の設定

```bash
# パッケージディレクトリ
packages/ccagi-sdk/

# テンプレート構成
templates/
├── .ccagi.yml
├── .agent-context.json
├── .claude/
│   ├── commands/     # 94コマンド
│   ├── skills/       # 13スキル
│   ├── mcp-servers/  # 12サーバー
│   └── mcp.json
├── .claude-plugin/
│   └── agents/       # 28エージェント
└── infra/
    └── terraform/

# インストール方法
gh release download v6.22.2 \
  --repo customer-cloud-club/ccagi-system \
  --pattern "*.tgz"

npm install ./customer-cloud-ccagi-sdk-6.22.2.tgz
npx ccagi-sdk init --force
```
