import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function checkStatus() {
  const cwd = process.cwd();

  console.log(chalk.bold.cyan('\n  CCAGI SDK ステータス\n'));

  // Check SDK files
  const sdkFiles = [
    { path: '.ccagi.yml', name: 'CCAGI設定' },
    { path: '.agent-context.json', name: 'エージェントコンテキスト' },
    { path: '.claude/mcp.json', name: 'MCP設定' },
    { path: '.claude/mcp-servers', name: 'MCPサーバー', isDir: true },
    { path: '.claude-plugin/agents', name: 'Agentプラグイン', isDir: true },
  ];

  console.log(chalk.gray('  SDK設定:'));
  let allFilesPresent = true;

  for (const file of sdkFiles) {
    const fullPath = path.join(cwd, file.path);
    const exists = await fs.pathExists(fullPath);
    const icon = exists ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${icon} ${file.name}`);
    if (!exists) allFilesPresent = false;
  }

  // Overall status
  console.log(chalk.gray('\n  全体ステータス:'));
  if (allFilesPresent) {
    console.log(`    ${chalk.green.bold('✓ SDK利用可能')}\n`);
  } else {
    console.log(`    ${chalk.red.bold('✗ セットアップが必要')}`);
    console.log(chalk.gray(`      npx ccagi-sdk init を実行してください\n`));
  }
}
