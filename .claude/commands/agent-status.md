# エージェント状態確認

全エージェントの状態を確認します。

## 実行

agent_list ツールを使用してエージェント一覧を取得:

```javascript
agent_list({})
```

## 確認項目

1. 利用可能なエージェント数
2. 各エージェントの能力
3. 実行中のタスク

## エージェント一覧

- coordinator: タスク統括
- codegen: コード生成
- review: 品質レビュー
- test: テスト実行
- security-agent: セキュリティ
- deployment: デプロイ
- その他...

詳細は`agent_info`で個別に確認できます。
