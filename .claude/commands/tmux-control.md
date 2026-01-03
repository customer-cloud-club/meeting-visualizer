---
description: TmuxControlAgentでtmuxセッションを管制する
---

# tmux 制御コマンド `/tmux-control`

TmuxControlAgent（つむっくん）が tmux セッションを監視・指示するためのスラッシュコマンド。
セッション整備・指示送信・ログ収集を自動化します。

## 主要機能

- セッション存在確認（`ensureSession`）と自動再生成
- Pane への安全な `send-keys` 注入（100ms スリープ + Enter）
- `capture-pane` でのログ取得と成功/失敗判定
- `/clear`・`kill-pane` など復旧手順の自動化
- 制御モード（`tmux -CC`）を利用したイベント購読（オプション）

## パラメータ

| 引数 | 必須 | 説明 | 例 |
|------|------|------|----|
| `session` | 任意 | 対象セッション名（未指定は `ccagi-auto-dev`） | `session=ccagi` |
| `pane` | 任意 | 対象 pane ID（未指定はデフォルト） | `pane=%4` |
| `command` | 任意 | 実行させたい指示本文 | `command=cd ... && npm run dev` |
| `mode` | 任意 | `send`（default） / `capture` / `recover` / `status` | `mode=capture` |

## 使用例

```bash
# コマンド実行
/tmux-control session=ccagi-auto-dev pane=%4 command="cd '/path/to/project' && npm run dev"

# ステータス確認
/tmux-control session=ccagi mode=status

# 復旧実行
/tmux-control pane=%2 mode=recover
```

## 実行フロー

```
セッション確認 → Pane マッピング → 指示送信（send-keys） → 100ms 待機 → Enter
    ↓
capture-pane でログ取得 → 成功/失敗マッチャーで判定
    ↓
異常時は /clear → 再指示 → (必要に応じ kill-pane / kill-session)
    ↓
結果を CoordinatorAgent へ通知
```

## モード詳細

### mode=send（デフォルト）
指定したコマンドをtmux paneに送信します。

```bash
/tmux-control command="npm test" mode=send
```

### mode=capture
paneの出力をキャプチャして表示します。

```bash
/tmux-control pane=%2 mode=capture
```

### mode=recover
問題が発生したpaneを復旧します。

```bash
/tmux-control pane=%4 mode=recover
```

### mode=status
セッションとpaneのステータスを確認します。

```bash
/tmux-control mode=status
```

## ベストプラクティス

- 指示は 1 コマンドずつ送信し、行末に `&& sleep 0.1 && tmux send-keys ... Enter` を追加
- 新タスク開始前には `/clear` を送ってログを区切る
- `mode=status` や `mode=capture` を活用し、ログ解析前に必要なコンテキストを取得
- 復旧不能 (`mode=recover` で 3 回失敗) の場合は CoordinatorAgent に `status:critical` を返し、人間オペレーターに連絡

## セーフティ

- `command` 引数はホワイトリストチェック後に送信。危険コマンド (rm, shutdown など) は拒否
- `kill-session` を伴う操作は二重確認プロンプトあり
- `tmux -vv` ログを必要に応じて自動採取し、`logs/` ディレクトリへ保存

## セッション管理

### セッション作成
```bash
# CCAGIデフォルトセッション作成
tmux new-session -d -s ccagi-auto-dev

# 複数ウィンドウ構成
tmux new-session -d -s ccagi-auto-dev -n main
tmux new-window -t ccagi-auto-dev -n agents
tmux new-window -t ccagi-auto-dev -n logs
```

### セッション一覧
```bash
tmux list-sessions
```

### セッション削除
```bash
tmux kill-session -t ccagi-auto-dev
```

## Pane管理

### Pane分割
```bash
# 水平分割
tmux split-window -h -t ccagi-auto-dev

# 垂直分割
tmux split-window -v -t ccagi-auto-dev
```

### Pane一覧
```bash
tmux list-panes -t ccagi-auto-dev
```

### Pane選択
```bash
# Pane IDで選択
tmux select-pane -t %4
```

## トラブルシューティング

### セッションが見つからない
```
Error: session not found: ccagi-auto-dev

解決策:
1. tmux list-sessions で確認
2. セッション作成: tmux new-session -d -s ccagi-auto-dev
```

### Paneが応答しない
```
Error: pane not responding

解決策:
1. /tmux-control mode=capture でログ確認
2. /tmux-control mode=recover で復旧試行
3. 必要に応じて pane を kill して再作成
```

### コマンドが実行されない
```
Error: command blocked by whitelist

解決策:
1. ホワイトリストに含まれるコマンドか確認
2. 危険なコマンドは手動実行を検討
```

## 関連ファイル

- `.claude/commands/tmux-control.md` - このファイル
- `.ccagi.yml` - CCAGI設定ファイル（tmux設定を含む）
- `.ai/logs/tmux-*.log` - tmux操作ログ

---

つむっくん（TmuxControlAgent）が tmux の交通整理を担当することで、AI 主導の CLI 操作が安定します。複雑なセッション構成でも `/tmux-control` で一貫した制御が可能です。
