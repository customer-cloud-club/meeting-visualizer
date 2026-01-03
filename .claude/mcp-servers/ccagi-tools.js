#!/usr/bin/env node
/**
 * CCAGI Tools MCP Server
 * 172個の統合ツールを提供するMCPサーバー
 *
 * カテゴリ:
 * - Git (19 tools)
 * - Docker (14 tools)
 * - Kubernetes (6 tools)
 * - Database (6 tools)
 * - Network (15 tools)
 * - Process (14 tools)
 * - Resource (10 tools)
 * - File (10 tools)
 * - Log (7 tools)
 * - Tmux (10 tools)
 * - GitHub (21 tools)
 * - Spec-Kit (9 tools)
 * - Utilities (31 tools)
 * Total: 172 tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { allTools, toolCategories, getTotalToolCount, getCategorySummary } from './handlers/index.js';

// サーバー初期化
const server = new Server(
  {
    name: 'ccagi-tools',
    version: '2.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * 利用可能なツール一覧を返す
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(allTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema || { type: 'object', properties: {} }
  }));

  return { tools };
});

/**
 * ツールを実行
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 特殊コマンド: ツール統計
  if (name === '__ccagi_tools_stats') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalTools: getTotalToolCount(),
          categories: getCategorySummary(),
          version: '2.0.0'
        }, null, 2)
      }]
    };
  }

  // 特殊コマンド: カテゴリ一覧
  if (name === '__ccagi_tools_categories') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(toolCategories, null, 2)
      }]
    };
  }

  // ツール検索
  const tool = allTools[name];

  if (!tool) {
    // 部分一致で候補を提示
    const suggestions = Object.keys(allTools)
      .filter(t => t.includes(name) || name.includes(t.split('_')[0]))
      .slice(0, 5);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: `Unknown tool: ${name}`,
          suggestions: suggestions.length > 0 ? suggestions : 'No similar tools found',
          hint: 'Use __ccagi_tools_categories to see available categories'
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    // ツール実行
    const result = await tool.handler(args || {});

    // 結果をフォーマット
    const content = typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2);

    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          tool: name,
          args
        }, null, 2)
      }],
      isError: true
    };
  }
});

/**
 * サーバー起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 起動ログ（stderrへ）
  console.error(`CCAGI Tools MCP Server v2.0.0`);
  console.error(`Loaded ${getTotalToolCount()} tools in ${Object.keys(toolCategories).length} categories`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
