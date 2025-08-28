# GitHub Webhook 手動設定手順

## 1. GitHubリポジトリで設定

1. **GitHubリポジトリを開く**
   - https://github.com/Plusing-net/Rezipang-NFTs-MINT

2. **Settings → Webhooks**
   - リポジトリのSettingsタブをクリック
   - 左メニューの「Webhooks」をクリック

3. **既存のVercel Webhookを確認**
   - Vercelのwebhookがあるか確認
   - ある場合は、右側の「Edit」をクリック

4. **Webhookが無効な場合**
   - 「Active」のチェックボックスを有効にする
   - 「Update webhook」をクリック

## 2. Webhookが存在しない場合（新規作成）

1. **Add webhook**をクリック

2. **以下を入力**：
   ```
   Payload URL: https://api.vercel.com/git/deployments
   Content type: application/json
   Secret: (空欄でOK)
   ```

3. **Which events would you like to trigger this webhook?**
   - 「Just the push event」を選択

4. **Active**にチェック

5. **Add webhook**をクリック

## 3. Vercel側で再接続

### 方法A: Vercelダッシュボードから

1. Vercelプロジェクトを開く
2. **Settings → Git**
3. **GitHub Integration**セクション
4. **Manage Repository Connection**
5. **Reconnect**または**Configure**

### 方法B: 完全に再接続

1. **Settings → Git**
2. **Disconnect from GitHub**
3. **Connect Git Repository**
4. リポジトリを選択: `Plusing-net/Rezipang-NFTs-MINT`
5. ブランチ: `feature/dynamic-payment-settings`

## 4. テスト

1. 空のコミットを作成してプッシュ：
   ```bash
   git commit --allow-empty -m "Test webhook"
   git push origin feature/dynamic-payment-settings
   ```

2. Vercelダッシュボードで確認
   - Deploymentsタブで新しいデプロイが開始されるか確認

## 5. それでもダメな場合

### Vercel CLIでログイン後デプロイ

```bash
# Vercelにログイン
npx vercel login

# プロダクションデプロイ
npx vercel --prod
```

### 環境変数を含めてデプロイ

```bash
npx vercel --prod \
  -e NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E \
  -e NEXT_PUBLIC_CHAIN_ID=137 \
  -e NEXT_PUBLIC_THIRDWEB_CLIENT_ID=c2cde64ddaeb11bea253645e26de19ab
```

## 重要な注意事項

- Webhookが有効でも、ブランチの設定が間違っていると自動デプロイされません
- Vercel側で正しいブランチ（`feature/dynamic-payment-settings`）が設定されているか確認
- GitHubのWebhook履歴で、リクエストが送信されているか確認（Recent Deliveriesセクション）