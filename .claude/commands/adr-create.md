# ADR（アーキテクチャ決定記録）作成

新しいADRを作成します。

## パラメータ

- `$1`: ADRタイトル（必須）

## 実行

architecture agentを起動して、以下の形式でADRを作成してください：

```markdown
# ADR-XXX: ${1}

## ステータス
Proposed | Accepted | Deprecated | Superseded

## コンテキスト
[この決定が必要な背景]

## 決定
[選択した方針とその理由]

## 結果
[この決定による影響、トレードオフ]

## 代替案
[検討した他の選択肢]
```

## 保存先

`docs/adr/XXXX-${1}.md`
