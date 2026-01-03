# Kubernetes デプロイ

Kubernetesクラスターにデプロイします。

## パラメータ

- `$1`: 環境（required: dev, staging, prod）

## 実行

```bash
# マニフェスト適用
kubectl apply -f k8s/${1}/

# Helm チャートの場合
helm upgrade --install ccagi ./helm/ccagi -f helm/values-${1}.yaml

# ロールアウト確認
kubectl rollout status deployment/ccagi -n ${1}
```

## 確認コマンド

```bash
# Pod状態
kubectl get pods -n ${1}

# ログ確認
kubectl logs -f deployment/ccagi -n ${1}

# リソース使用量
kubectl top pods -n ${1}
```
