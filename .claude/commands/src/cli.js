#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';
import { initProject } from './commands/init.js';
import { checkStatus } from './commands/status.js';
import { upgradeSDK } from './commands/upgrade.js';

// package.jsonからバージョンを動的取得
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('ccagi-sdk')
  .description('CCAGI SDK - 1コマンドで完全なアプリケーションを自動生成')
  .version(version);

program
  .command('init')
  .description('プロジェクトにCCAGI SDKをセットアップ')
  .option('-y, --yes', '確認をスキップして自動上書き')
  .option('-f, --force', '強制上書き（既存ファイルを完全に置換）')
  .option('--dry-run', '変更を適用せずに確認のみ')
  .action(async (options) => {
    try {
      await initProject(options);
    } catch (error) {
      console.error(chalk.red('エラー:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('SDK設定状態を確認')
  .action(async () => {
    try {
      await checkStatus();
    } catch (error) {
      console.error(chalk.red('エラー:'), error.message);
      process.exit(1);
    }
  });

program
  .command('upgrade')
  .description('SDKを最新バージョンにアップグレード')
  .option('-c, --check', 'アップグレード可能かチェックのみ')
  .option('-f, --force', '同じバージョンでも強制アップグレード')
  .option('-p, --project', 'プロジェクトのテンプレートも更新')
  .action(async (options) => {
    try {
      await upgradeSDK(options);
    } catch (error) {
      console.error(chalk.red('エラー:'), error.message);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('環境診断')
  .action(async () => {
    const spinner = ora('環境を診断中...').start();

    const checks = [
      { name: 'Node.js', check: () => process.version >= 'v18.0.0' },
      { name: 'Claude Code', check: async () => {
        const { execSync } = await import('child_process');
        try {
          execSync('claude --version', { stdio: 'pipe' });
          return true;
        } catch { return false; }
      }},
    ];

    spinner.stop();
    console.log(chalk.bold('\n環境診断結果:\n'));

    for (const { name, check } of checks) {
      const ok = await check();
      console.log(`  ${ok ? chalk.green('✓') : chalk.red('✗')} ${name}`);
    }
    console.log();
  });

program.parse();
