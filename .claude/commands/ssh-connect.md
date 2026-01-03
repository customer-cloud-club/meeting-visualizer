---
description: SSH Remote Development - リモート開発環境への接続
---

# /ssh-connect - SSH Remote Development Command

リモートサーバーへの接続、リソース監視、Claude Codeリモート実行を統合管理します。

**Version**: 2.0 for CCAGI

---

## Quick Start

```bash
# ヘルスチェック
/ssh-connect

# リモートでClaude実行
/ssh-connect machine=dev mode=claude command="npm test"

# リソース監視
/ssh-connect machine=dev mode=monitor
```

---

## 管理対象マシン

### Development Server

```yaml
Type: Remote Development Server
Connection: ssh dev
Purpose:
  - Heavy build/test execution
  - Parallel Agent execution
  - CI/CD environment
```

設定は `.ccagi.yml` で管理：

```yaml
ssh:
  machines:
    dev:
      host: dev.example.com
      user: developer
      key: ~/.ssh/id_rsa
      port: 22
```

---

## パラメータ

| Parameter | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `machine` | No | string | マシン名 (default: `dev`) | `machine=dev` |
| `mode` | No | enum | 実行モード (default: `status`) | `mode=monitor` |
| `command` | Conditional | string | リモートコマンド | `command="npm test"` |
| `file` | Conditional | path | 転送ファイル | `file="./binary"` |
| `destination` | Conditional | path | 転送先パス | `destination="~/bin/"` |
| `permissions` | No | enum | Claude権限モード | `permissions=skip` |

### Mode Options

| Mode | Description | Use Case | Command Required |
|------|-------------|----------|------------------|
| `status` | Health check + resource summary | Quick verification | No |
| `monitor` | Detailed resource monitoring | Deep inspection | No |
| `execute` | Execute remote command | General command execution | Yes |
| `claude` | Execute with Claude Code | AI-assisted development | Yes |
| `transfer` | File transfer (scp) | Deploy binaries | file + destination |
| `connect` | Interactive SSH connection | Manual operations | No |

---

## 使用例

### 例1: ヘルスチェック（デフォルト）

```bash
/ssh-connect
```

出力:
```
=== SSH Connection Status ===
✓ dev: Connected | CPU: 23% | Memory: 35% | Disk: 34%
```

### 例2: 詳細リソース監視

```bash
/ssh-connect machine=dev mode=monitor
```

出力:
- CPU使用率（コア別）
- メモリ内訳
- ディスク使用量
- Top 10プロセス

### 例3: リモートClaude実行（推奨）

```bash
# Method 1: 設定ファイル使用（推奨）
/ssh-connect machine=dev mode=claude \
  command="claude --settings .claude/settings.json 'npm run build'"

# Method 2: 明示的な権限指定
/ssh-connect machine=dev mode=claude \
  command="claude --allowed-tools 'Bash(npm:*)' 'Run tests'"
```

### 例4: 標準リモート実行

```bash
# ビルド実行
/ssh-connect machine=dev mode=execute \
  command="cd ~/ccagi-system && npm run build"

# Docker操作
/ssh-connect machine=dev mode=execute \
  command="docker ps -a"

# Git操作
/ssh-connect machine=dev mode=execute \
  command="cd ~/ccagi-system && git pull && git status"
```

### 例5: ファイル転送

```bash
# バイナリをアップロード
/ssh-connect machine=dev mode=transfer \
  file="./dist/ccagi" \
  destination="~/bin/"

# 設定ファイルをアップロード
/ssh-connect machine=dev mode=transfer \
  file=".claude/settings.json" \
  destination="~/ccagi-system/.claude/"
```

### 例6: インタラクティブ接続

```bash
/ssh-connect machine=dev mode=connect

# インタラクティブSSHセッションを開く
# 用途:
# - 手動デバッグ
# - 複雑な操作
# - 環境セットアップ
```

---

## Claude Code統合

### 安全な実行パターン

```bash
# Pattern 1: 設定ベース（最も安全）
/ssh-connect machine=dev mode=claude \
  command="cd ~/ccagi-system && \
           claude --settings .claude/settings.json \
                  'Implement Feature X'"

# Pattern 2: 明示的allowlist
/ssh-connect machine=dev mode=claude \
  command="claude --allowed-tools 'Bash(npm:*) Bash(git:*) Read Write Edit' \
                  'Fix bug in module Y'"

# Pattern 3: Permission mode
/ssh-connect machine=dev mode=claude \
  command="claude --permission-mode acceptEdits \
                  'Refactor component Z'"
```

### Dangerous Pattern（注意）

```bash
# ⚠️ 隔離されたCI/CDコンテナのみで使用
/ssh-connect machine=dev mode=claude permissions=skip \
  command="docker run --rm --network none ccagi-ci \
           'claude --dangerously-skip-permissions -p \"npm test\"'"
```

### tmux統合

```bash
# リモートtmuxセッション作成
/ssh-connect machine=dev mode=execute \
  command="tmux new-session -d -s dev \
           'cd ~/ccagi-system && \
            claude --settings .claude/settings.json'"

# セッションにアタッチ
/ssh-connect machine=dev mode=connect
# SSH内で: tmux attach -t dev
```

---

## ステータス表示形式

### 標準出力

```bash
=== SSH Connection Status ===

✓ dev
  Status: Connected ✓
  Uptime: 1 day, 7:00
  Load: 1.05, 1.03, 1.03

  Resources:
    CPU: 8 vCPU | 23% used | ✓ Normal
    Memory: 32GB | 11GB used (35%) | ✓ Normal
    Disk: 100GB | 34GB used (34%) | ✓ Normal

  Top Processes:
    1. npm run build (12% CPU, 2GB RAM)
    2. node (8% CPU, 1.5GB RAM)

=== All systems operational ===
```

### 警告インジケーター

```
✓ Normal: < 80%
⚠ Warning: CPU > 80% or Memory > 85% or Disk > 90%
✗ Critical: Any > 95%
```

---

## セキュリティ & 安全

### コマンドホワイトリスト（mode=execute）

**✓ 許可されたコマンド**:
```bash
# System
cd, ls, pwd, cat, grep, find, echo, mkdir

# Development
npm install, npm run, npm test
node, npx

# Git
git status, git log, git diff, git pull, git push

# Docker
docker ps, docker images, docker logs, docker run

# Monitoring
htop, top, free, df, uptime, ps

# tmux
tmux list-sessions, tmux attach, tmux new-session
```

**✗ ブロックされたコマンド**:
```bash
# Destructive
rm -rf, shutdown, reboot, halt

# Disk operations
dd, mkfs, fdisk

# Network/Security
iptables, ufw disable

# System modification
chroot, systemctl stop, kill -9 1
```

### SSH Security

```yaml
Authentication:
  - Public key only
  - No password authentication

Key Permissions:
  - Must be 600 (rw-------)
  - Auto-check before connection

Connection:
  - Timeout: 5 seconds
  - ServerAliveInterval: 60s

Logging:
  - All commands logged
  - Audit trail enabled
```

### Claude Permission Modes

| Mode | Safety Level | Use Case | Command |
|------|--------------|----------|---------|
| **Settings-based** | ✓✓✓ High | Production | `--settings .claude/settings.json` |
| **Explicit allowlist** | ✓✓ Medium | Development | `--allowed-tools "Bash(npm:*)"` |
| **Permission mode** | ✓ Low | Quick tasks | `--permission-mode acceptEdits` |
| **Skip permissions** | ⚠⚠⚠ Very Low | CI/CD only | `--dangerously-skip-permissions` |

---

## トラブルシューティング

### Issue: Connection Timeout

**症状**:
```
Error: Connection to dev timed out
```

**解決策**:
```bash
# 1. サーバー状態確認
ping dev.example.com

# 2. SSH設定確認
cat ~/.ssh/config | grep -A 10 "^Host dev"

# 3. 鍵権限確認
ls -l ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
```

### Issue: Permission Denied

**症状**:
```
Permission denied (publickey)
```

**解決策**:
```bash
# 1. 鍵権限確認
chmod 600 ~/.ssh/id_rsa

# 2. SSH設定確認
cat ~/.ssh/config

# 3. 明示的な鍵指定でテスト
ssh -i ~/.ssh/id_rsa user@dev.example.com
```

### Issue: Claude Command Not Found

**症状**:
```
bash: claude: command not found
```

**解決策**:
```bash
# 1. Claude Codeインストール
/ssh-connect machine=dev mode=execute \
  command="npm install -g @anthropic-ai/claude-code"

# 2. PATH確認
/ssh-connect machine=dev mode=execute \
  command="echo \$PATH"

# 3. インストール確認
/ssh-connect machine=dev mode=execute \
  command="which claude && claude --version"
```

---

## パフォーマンス最適化

### ビルド時間比較

| Task | Local (M2 Mac) | Remote Server | Speedup |
|------|----------------|---------------|---------|
| `npm run build` | 120s | 35s | **3.4x** |
| `npm test` | 90s | 25s | **3.6x** |
| `npm run lint` | 30s | 8s | **3.8x** |

### ベストプラクティス

```bash
# 1. tmuxで長時間タスク実行
/ssh-connect machine=dev mode=execute \
  command="tmux new-session -d -s build 'npm run build'"

# 2. バックグラウンド実行
/ssh-connect machine=dev mode=execute \
  command="nohup npm run build > build.log 2>&1 &"

# 3. 並列実行
/ssh-connect machine=dev mode=execute \
  command="npm test --jobs 8"
```

---

## 関連ドキュメント

- CCAGI設定: `.ccagi.yml`
- SSH設定: `~/.ssh/config`
- セキュリティポリシー: `docs/SECURITY.md`

---

## Quick Reference Card

```bash
# === Basic Operations ===
/ssh-connect                                # Health check
/ssh-connect machine=dev mode=monitor       # Resource monitor
/ssh-connect machine=dev mode=connect       # Interactive SSH

# === Claude Execution (Recommended) ===
/ssh-connect machine=dev mode=claude \
  command="claude --settings .claude/settings.json 'Task'"

# === Remote Execution ===
/ssh-connect machine=dev mode=execute \
  command="cd ~/ccagi-system && npm run build"

# === File Transfer ===
/ssh-connect machine=dev mode=transfer \
  file="./binary" destination="~/bin/"
```

---

**Status**: Production Ready for CCAGI
**Version**: 2.0.0
**Last Updated**: 2025-12-04
