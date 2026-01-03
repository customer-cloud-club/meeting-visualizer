# Kubernetes状態確認

Kubernetesクラスターの状態を確認します。

## 実行

```bash
# クラスター情報
kubectl cluster-info

# ノード状態
kubectl get nodes

# 全リソース
kubectl get all -A

# Pod詳細
kubectl describe pods -l app=ccagi
```

## 監視コマンド

```bash
# リアルタイムPod監視
kubectl get pods -w

# イベント確認
kubectl get events --sort-by='.lastTimestamp'

# ログストリーム
kubectl logs -f -l app=ccagi --all-containers
```
