import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.jsonからバージョンを動的に取得
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
const SDK_VERSION = packageJson.version;

export async function initProject(options = {}) {
  const cwd = process.cwd();
  const templatesDir = path.resolve(__dirname, '../../templates');

  console.log(chalk.bold.cyan(`\n  CCAGI SDK v${SDK_VERSION} セットアップ\n`));

  // Check if already initialized
  const ccagiYmlPath = path.join(cwd, '.ccagi.yml');
  const alreadyExists = await fs.pathExists(ccagiYmlPath);

  if (alreadyExists) {
    console.log(chalk.yellow('  既にCCAGI SDKが設定されています'));

    // --force または --yes で上書き
    if (options.force) {
      console.log(chalk.cyan('  --force: 強制上書きモード'));
    } else if (options.yes) {
      console.log(chalk.cyan('  --yes: 自動上書きモード'));
    } else {
      // 対話的に確認
      const { default: inquirer } = await import('inquirer');
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: '上書きしますか？（最新バージョンで更新されます）',
        default: true
      }]);
      if (!overwrite) {
        console.log(chalk.gray('  キャンセルしました\n'));
        return;
      }
    }
    console.log(chalk.gray('  既存のファイルを上書きします...\n'));
  }

  // Files to copy
  const filesToCopy = [
    { src: '.ccagi.yml', dest: '.ccagi.yml' },
    { src: '.agent-context.json', dest: '.agent-context.json' },
    { src: '.claude/mcp.json', dest: '.claude/mcp.json' },
    { src: '.claude/mcp-servers', dest: '.claude/mcp-servers', isDir: true },
    { src: '.claude/commands', dest: '.claude/commands', isDir: true },
    { src: '.claude/skills', dest: '.claude/skills', isDir: true },  // スキルをコピー
    { src: '.claude-plugin/agents', dest: '.claude-plugin/agents', isDir: true },
    { src: 'infra/terraform/modules/codepipeline', dest: 'infra/terraform/modules/codepipeline', isDir: true },
  ];

  if (options.dryRun) {
    console.log(chalk.gray('  ドライラン: 以下のファイルが作成されます\n'));
    for (const file of filesToCopy) {
      console.log(chalk.gray(`    ${file.dest}`));
    }
    console.log();
    return;
  }

  const spinner = ora('SDK設定ファイルを配置中...').start();

  try {
    let copiedCount = 0;
    for (const file of filesToCopy) {
      const srcPath = path.join(templatesDir, file.src);
      const destPath = path.join(cwd, file.dest);

      if (await fs.pathExists(srcPath)) {
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath, { overwrite: true });
        copiedCount++;
      }
    }

    spinner.succeed(`SDK設定ファイルを配置しました (${copiedCount}項目)`);

    console.log(chalk.bold.green('\n  セットアップ完了!\n'));
    console.log(chalk.gray('  次のステップ:'));
    console.log(chalk.white('    1. Claude Codeを起動: ') + chalk.cyan('claude'));
    console.log(chalk.white('    2. SDKコマンドを実行: ') + chalk.cyan('/generate-app --help'));
    console.log(chalk.white('    3. 状態確認: ') + chalk.cyan('npx ccagi-sdk status'));
    console.log();

  } catch (error) {
    spinner.fail('セットアップに失敗しました');
    throw error;
  }
}
