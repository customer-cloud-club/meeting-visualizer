import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const { version: currentVersion } = require('../../package.json');

const REPO = 'customer-cloud-club/ccagi-system';

/**
 * GitHub Releaseから最新バージョンを取得
 */
async function getLatestVersion() {
  try {
    const result = execSync(
      `gh release list --repo ${REPO} --limit 1 --json tagName --jq '.[0].tagName'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result.replace(/^v/, '');
  } catch (error) {
    throw new Error('GitHub Releaseの取得に失敗しました。gh CLIがインストールされ、認証済みか確認してください。');
  }
}

/**
 * バージョン比較 (semver簡易版)
 */
function isNewerVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

/**
 * SDKをアップグレード
 */
export async function upgradeSDK(options = {}) {
  const { check, force, project } = options;

  console.log(chalk.bold('\n🔄 CCAGI SDK Upgrade\n'));
  console.log(`現在のバージョン: ${chalk.cyan('v' + currentVersion)}`);

  // 最新バージョンを取得
  const spinner = ora('最新バージョンを確認中...').start();
  let latestVersion;

  try {
    latestVersion = await getLatestVersion();
    spinner.succeed(`最新バージョン: ${chalk.green('v' + latestVersion)}`);
  } catch (error) {
    spinner.fail(error.message);
    process.exit(1);
  }

  // バージョン比較
  if (!isNewerVersion(latestVersion, currentVersion) && !force) {
    console.log(chalk.green('\n✅ 既に最新バージョンです\n'));
    return;
  }

  if (check) {
    if (isNewerVersion(latestVersion, currentVersion)) {
      console.log(chalk.yellow(`\n⚠️ 新しいバージョンが利用可能です: v${latestVersion}`));
      console.log(chalk.dim('アップグレードするには: ccagi-sdk upgrade\n'));
    }
    return;
  }

  console.log(chalk.yellow(`\n📦 v${currentVersion} → v${latestVersion} にアップグレードします\n`));

  // tarballをダウンロード
  const tmpDir = os.tmpdir();
  const tarballName = `customer-cloud-ccagi-sdk-${latestVersion}.tgz`;
  const tarballPath = path.join(tmpDir, tarballName);

  const downloadSpinner = ora('tarballをダウンロード中...').start();
  try {
    execSync(
      `gh release download v${latestVersion} --repo ${REPO} --pattern "*.tgz" --dir "${tmpDir}" --clobber`,
      { stdio: 'pipe' }
    );
    downloadSpinner.succeed('tarballをダウンロード完了');
  } catch (error) {
    downloadSpinner.fail('tarballのダウンロードに失敗しました');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // グローバルインストール
  const installSpinner = ora('グローバルインストール中...').start();
  try {
    execSync(`npm install -g "${tarballPath}"`, { stdio: 'pipe' });
    installSpinner.succeed('グローバルインストール完了');
  } catch (error) {
    installSpinner.fail('グローバルインストールに失敗しました');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // プロジェクトも更新（オプション）
  if (project || fs.existsSync('.ccagi.yml')) {
    const projectSpinner = ora('プロジェクトを更新中...').start();
    try {
      execSync('npx ccagi-sdk init --force', { stdio: 'pipe' });
      projectSpinner.succeed('プロジェクト更新完了');
    } catch (error) {
      projectSpinner.warn('プロジェクト更新をスキップ（ccagi-sdkプロジェクトではない可能性）');
    }
  }

  // クリーンアップ
  try {
    fs.unlinkSync(tarballPath);
  } catch (e) {
    // ignore
  }

  console.log(chalk.green(`\n✅ CCAGI SDK v${latestVersion} にアップグレードしました\n`));

  // 確認
  try {
    const newVersion = execSync('ccagi-sdk --version', { encoding: 'utf-8' }).trim();
    console.log(`確認: ${chalk.cyan('ccagi-sdk --version')} → ${chalk.green(newVersion)}\n`);
  } catch (e) {
    // ignore
  }
}
