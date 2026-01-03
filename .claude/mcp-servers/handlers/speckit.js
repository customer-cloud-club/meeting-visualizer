/**
 * Spec-Kit Handler - 9 Tools
 * 仕様書・ドキュメント生成ツール
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';

const exec = (cmd, options = {}) => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

export const speckitTools = {
  speckit_generate: {
    description: '仕様書テンプレートを生成',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['feature', 'api', 'component', 'workflow', 'architecture'],
          description: '仕様書タイプ'
        },
        name: { type: 'string', description: '仕様書名' },
        outputPath: { type: 'string', description: '出力パス' }
      },
      required: ['type', 'name']
    },
    handler: async ({ type, name, outputPath }) => {
      const templates = {
        feature: `# ${name} 機能仕様書

## 概要
[機能の概要を記述]

## 目的
[この機能が解決する問題]

## 要件
### 機能要件
- [ ] 要件1
- [ ] 要件2

### 非機能要件
- パフォーマンス:
- セキュリティ:
- 可用性:

## ユースケース
1. ユースケース1
2. ユースケース2

## 設計
### データフロー
\`\`\`
[入力] → [処理] → [出力]
\`\`\`

### インターフェース
\`\`\`typescript
interface ${name}Input {
  // 入力パラメータ
}

interface ${name}Output {
  // 出力データ
}
\`\`\`

## テスト計画
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] E2Eテスト

## タイムライン
- フェーズ1: 設計
- フェーズ2: 実装
- フェーズ3: テスト
- フェーズ4: デプロイ
`,
        api: `# ${name} API仕様書

## エンドポイント概要
| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/${name.toLowerCase()} | 一覧取得 |
| POST | /api/${name.toLowerCase()} | 新規作成 |
| GET | /api/${name.toLowerCase()}/:id | 詳細取得 |
| PUT | /api/${name.toLowerCase()}/:id | 更新 |
| DELETE | /api/${name.toLowerCase()}/:id | 削除 |

## リクエスト/レスポンス

### GET /api/${name.toLowerCase()}
**レスポンス**
\`\`\`json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
\`\`\`

### POST /api/${name.toLowerCase()}
**リクエスト**
\`\`\`json
{
  "field1": "value1"
}
\`\`\`

**レスポンス**
\`\`\`json
{
  "id": "uuid",
  "field1": "value1",
  "createdAt": "ISO8601"
}
\`\`\`

## エラーコード
| コード | 説明 |
|--------|------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## 認証
- Bearer Token required
- Scope: \`${name.toLowerCase()}:read\`, \`${name.toLowerCase()}:write\`
`,
        component: `# ${name} コンポーネント仕様書

## 概要
[コンポーネントの説明]

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | 説明 |
| prop2 | number | No | 0 | 説明 |

## イベント
| Event | Payload | Description |
|-------|---------|-------------|
| onChange | value | 値変更時 |
| onSubmit | data | 送信時 |

## スロット
| Slot | Description |
|------|-------------|
| default | メインコンテンツ |
| header | ヘッダー |

## 使用例
\`\`\`tsx
import { ${name} } from './components/${name}';

function Example() {
  return (
    <${name}
      prop1="value"
      onChange={(v) => console.log(v)}
    />
  );
}
\`\`\`

## スタイリング
\`\`\`css
.${name.toLowerCase()} {
  /* base styles */
}
.${name.toLowerCase()}--variant {
  /* variant styles */
}
\`\`\`
`,
        workflow: `# ${name} ワークフロー仕様書

## 概要
[ワークフローの説明]

## フロー図
\`\`\`mermaid
graph TD
    A[開始] --> B{条件判定}
    B -->|Yes| C[処理1]
    B -->|No| D[処理2]
    C --> E[終了]
    D --> E
\`\`\`

## ステップ詳細

### ステップ1: 開始
- トリガー: [トリガー条件]
- 入力: [必要な入力]

### ステップ2: 処理
- アクション: [実行される処理]
- 担当: [担当者/システム]
- SLA: [所要時間目安]

### ステップ3: 完了
- 出力: [出力結果]
- 通知: [通知先]

## エラーハンドリング
| エラー | 対応 |
|--------|------|
| タイムアウト | リトライ(最大3回) |
| 認証エラー | エスカレーション |

## 監視・アラート
- メトリクス: [監視項目]
- 閾値: [アラート条件]
`,
        architecture: `# ${name} アーキテクチャ仕様書

## システム概要
[システムの概要説明]

## アーキテクチャ図
\`\`\`
┌─────────────────────────────────────────┐
│                 Client                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              API Gateway                 │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Service A │ │ Service B │ │ Service C │
└───────────┘ └───────────┘ └───────────┘
        │           │           │
        └───────────┼───────────┘
                    ▼
┌─────────────────────────────────────────┐
│               Database                   │
└─────────────────────────────────────────┘
\`\`\`

## コンポーネント

### Service A
- 役割: [役割の説明]
- 技術スタック: [使用技術]
- スケーリング: [スケーリング戦略]

### Service B
- 役割: [役割の説明]
- 技術スタック: [使用技術]
- スケーリング: [スケーリング戦略]

## データフロー
1. クライアントからのリクエスト
2. API Gatewayでの認証・ルーティング
3. サービスでの処理
4. データベースアクセス
5. レスポンス返却

## 非機能要件
| 項目 | 要件 |
|------|------|
| 可用性 | 99.9% |
| レイテンシ | p99 < 200ms |
| スループット | 10,000 req/s |

## セキュリティ
- 認証: OAuth 2.0 / JWT
- 暗号化: TLS 1.3
- アクセス制御: RBAC

## 監視・運用
- ログ: 集約ログ基盤
- メトリクス: Prometheus/Grafana
- アラート: PagerDuty
`
      };

      const content = templates[type] || templates.feature;

      if (outputPath) {
        writeFileSync(outputPath, content);
        return { status: 'created', path: outputPath, type };
      }

      return { content, type };
    }
  },

  speckit_validate: {
    description: '仕様書の妥当性を検証',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '仕様書パス' }
      },
      required: ['path']
    },
    handler: async ({ path }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }

      const content = readFileSync(path, 'utf-8');
      const issues = [];
      const warnings = [];

      // 必須セクションチェック
      const requiredSections = ['## 概要', '## 要件', '## 設計'];
      requiredSections.forEach(section => {
        if (!content.includes(section)) {
          warnings.push(`Missing section: ${section}`);
        }
      });

      // TODOチェック
      const todoMatches = content.match(/\[TODO\]|\[TBD\]|\[WIP\]/gi);
      if (todoMatches) {
        warnings.push(`Incomplete items found: ${todoMatches.length}`);
      }

      // 空のセクションチェック
      const emptySection = content.match(/##[^\n]+\n\n##/g);
      if (emptySection) {
        issues.push(`Empty sections detected: ${emptySection.length}`);
      }

      // リンク切れチェック（ローカルファイル）
      const localLinks = content.match(/\]\((?!http)[^)]+\)/g) || [];
      localLinks.forEach(link => {
        const linkPath = link.slice(2, -1);
        const fullPath = join(path, '..', linkPath);
        if (!existsSync(fullPath)) {
          issues.push(`Broken link: ${linkPath}`);
        }
      });

      return {
        path,
        valid: issues.length === 0,
        issues,
        warnings,
        stats: {
          lines: content.split('\n').length,
          words: content.split(/\s+/).length,
          sections: (content.match(/^##/gm) || []).length
        }
      };
    }
  },

  speckit_list: {
    description: '仕様書一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: '検索ディレクトリ' },
        pattern: { type: 'string', description: 'ファイルパターン', default: '*.md' }
      }
    },
    handler: async ({ directory = '.', pattern = '*.md' }) => {
      const result = exec(`find "${directory}" -name "${pattern}" -type f 2>/dev/null`);
      if (result.error) return result;

      const files = result.split('\n').filter(Boolean);
      const specs = files.map(file => {
        const content = readFileSync(file, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        return {
          path: file,
          title: titleMatch ? titleMatch[1] : basename(file),
          size: content.length,
          lines: content.split('\n').length
        };
      });

      return { count: specs.length, specs };
    }
  },

  speckit_diff: {
    description: '仕様書の差分を比較',
    inputSchema: {
      type: 'object',
      properties: {
        file1: { type: 'string' },
        file2: { type: 'string' }
      },
      required: ['file1', 'file2']
    },
    handler: async ({ file1, file2 }) => {
      if (!existsSync(file1) || !existsSync(file2)) {
        return { error: 'One or both files not found' };
      }
      return exec(`diff -u "${file1}" "${file2}" 2>/dev/null || true`);
    }
  },

  speckit_export: {
    description: '仕様書をエクスポート',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '仕様書パス' },
        format: { type: 'string', enum: ['html', 'pdf', 'json'], default: 'html' }
      },
      required: ['path']
    },
    handler: async ({ path, format = 'html' }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }

      const content = readFileSync(path, 'utf-8');
      const outputPath = path.replace(extname(path), `.${format}`);

      switch (format) {
        case 'html':
          // 簡易HTML変換
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${basename(path)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  </style>
</head>
<body>
${content
  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\n\n/g, '</p><p>')
}
</body>
</html>`;
          writeFileSync(outputPath, html);
          return { status: 'exported', path: outputPath, format };

        case 'json':
          // JSON形式にパース
          const sections = {};
          let currentSection = 'intro';
          content.split('\n').forEach(line => {
            const h2Match = line.match(/^## (.+)/);
            if (h2Match) {
              currentSection = h2Match[1];
              sections[currentSection] = [];
            } else if (sections[currentSection]) {
              sections[currentSection].push(line);
            }
          });

          const json = {
            title: content.match(/^# (.+)/m)?.[1] || basename(path),
            sections: Object.fromEntries(
              Object.entries(sections).map(([k, v]) => [k, v.join('\n').trim()])
            )
          };
          writeFileSync(outputPath, JSON.stringify(json, null, 2));
          return { status: 'exported', path: outputPath, format };

        case 'pdf':
          // pandocが必要
          const result = exec(`pandoc "${path}" -o "${outputPath}" 2>&1`);
          if (result.error) {
            return { error: 'PDF export requires pandoc. Install with: brew install pandoc' };
          }
          return { status: 'exported', path: outputPath, format };

        default:
          return { error: 'Unsupported format' };
      }
    }
  },

  speckit_search: {
    description: '仕様書内を検索',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: '検索ディレクトリ' },
        query: { type: 'string', description: '検索クエリ' }
      },
      required: ['query']
    },
    handler: async ({ directory = '.', query }) => {
      const result = exec(`grep -rn "${query}" "${directory}" --include="*.md" 2>/dev/null || true`);
      if (!result || result.error) return { matches: [] };

      const matches = result.split('\n').filter(Boolean).map(line => {
        const [file, lineNum, ...content] = line.split(':');
        return { file, line: parseInt(lineNum), content: content.join(':').trim() };
      });

      return { query, count: matches.length, matches: matches.slice(0, 50) };
    }
  },

  speckit_template_list: {
    description: '利用可能なテンプレート一覧',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return {
        templates: [
          { name: 'feature', description: '機能仕様書 - 新機能の要件定義' },
          { name: 'api', description: 'API仕様書 - RESTful APIの定義' },
          { name: 'component', description: 'コンポーネント仕様書 - UIコンポーネント定義' },
          { name: 'workflow', description: 'ワークフロー仕様書 - 業務フロー定義' },
          { name: 'architecture', description: 'アーキテクチャ仕様書 - システム構成定義' }
        ]
      };
    }
  },

  speckit_toc: {
    description: '目次を生成',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '仕様書パス' },
        maxDepth: { type: 'number', description: '最大深度', default: 3 }
      },
      required: ['path']
    },
    handler: async ({ path, maxDepth = 3 }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }

      const content = readFileSync(path, 'utf-8');
      const headings = [];

      content.split('\n').forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
          const level = match[1].length;
          if (level <= maxDepth) {
            const title = match[2];
            const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            headings.push({
              level,
              title,
              slug,
              line: index + 1,
              indent: '  '.repeat(level - 1)
            });
          }
        }
      });

      const toc = headings.map(h => `${h.indent}- [${h.title}](#${h.slug})`).join('\n');

      return {
        path,
        toc,
        headings: headings.map(h => ({ level: h.level, title: h.title, line: h.line }))
      };
    }
  },

  speckit_stats: {
    description: '仕様書の統計情報',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '仕様書パス' }
      },
      required: ['path']
    },
    handler: async ({ path }) => {
      if (!existsSync(path)) {
        return { error: 'File not found' };
      }

      const content = readFileSync(path, 'utf-8');
      const lines = content.split('\n');

      const stats = {
        path,
        lines: lines.length,
        words: content.split(/\s+/).filter(Boolean).length,
        characters: content.length,
        headings: {
          h1: (content.match(/^# /gm) || []).length,
          h2: (content.match(/^## /gm) || []).length,
          h3: (content.match(/^### /gm) || []).length,
          h4: (content.match(/^#### /gm) || []).length
        },
        codeBlocks: (content.match(/```/g) || []).length / 2,
        tables: (content.match(/^\|/gm) || []).length,
        links: (content.match(/\[.+?\]\(.+?\)/g) || []).length,
        images: (content.match(/!\[.+?\]\(.+?\)/g) || []).length,
        todos: (content.match(/- \[ \]/g) || []).length,
        completed: (content.match(/- \[x\]/gi) || []).length
      };

      stats.completionRate = stats.todos + stats.completed > 0
        ? ((stats.completed / (stats.todos + stats.completed)) * 100).toFixed(1) + '%'
        : 'N/A';

      return stats;
    }
  }
};

export default speckitTools;
