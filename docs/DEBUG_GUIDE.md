# デバッグガイド

このドキュメントでは、NFTミントサイトのデバッグ方法について説明します。

## エラーログの有効化

本番環境ではパフォーマンスとユーザー体験を考慮して、詳細なエラーログは無効化されています。
開発時にエラーをデバッグする必要がある場合は、以下の手順でログを有効化してください。

### SimpleMint.tsxのエラーログ有効化

`components/SimpleMint.tsx`内のコメントアウトされている`console.error`文を有効化します。

#### 対象箇所と用途

1. **トークン情報取得エラー** (182行目付近)
   ```typescript
   // console.error("Error fetching token info:", error);
   ```
   → コメントを外すと、トークン情報の取得エラーが表示されます

2. **供給量情報取得エラー** (213行目付近)
   ```typescript
   // console.error('Error fetching supply info:', error);
   ```
   → コメントを外すと、NFT供給量の取得エラーが表示されます

3. **承認チェックエラー** (594行目付近)
   ```typescript
   // console.error("承認チェックエラー:", error);
   ```
   → コメントを外すと、トークン承認状態のチェックエラーが表示されます

4. **クレーム条件エラー** (669行目付近)
   ```typescript
   // console.error("❌ Error checking claim condition:", error);
   ```
   → コメントを外すと、Thirdwebのクレーム条件取得エラーが表示されます

5. **ミント失敗エラー** (722, 877行目付近)
   ```typescript
   // console.error("claimTo failed:", claimError);
   // console.error(`Method ${attempt.name} failed:`, error?.message || error);
   ```
   → コメントを外すと、各ミント試行の詳細なエラーが表示されます

6. **最終エラーサマリー** (898-900行目付近)
   ```typescript
   // console.error("❌ Mint failed with all methods");
   // console.error("Attempted methods:", attemptedMethods);
   // console.error("Last error:", errorDetails);
   ```
   → コメントを外すと、全てのミント試行が失敗した際の詳細情報が表示されます

### デバッグ手順

1. **開発環境でのみ有効化**
   ```bash
   # ローカル開発環境で作業
   git checkout feature/debug-mode
   ```

2. **必要な箇所のコメントを外す**
   ```typescript
   // 例: ミントエラーをデバッグする場合
   console.error(`Method ${attempt.name} failed:`, error?.message || error);
   ```

3. **ブラウザの開発者ツールでログを確認**
   - Chrome/Edge: F12 → Console タブ
   - Firefox: Ctrl+Shift+K (Cmd+Option+K on Mac)
   - Safari: Develop → Show JavaScript Console

4. **デバッグ完了後は必ずコメントアウトに戻す**
   ```bash
   # 本番環境にプッシュする前に確認
   git diff components/SimpleMint.tsx
   ```

### 環境変数によるデバッグモード

より安全にデバッグする場合は、環境変数でデバッグモードを制御することも可能です：

```typescript
// components/SimpleMint.tsx の先頭に追加
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// エラー出力箇所を条件分岐
if (DEBUG_MODE) {
  console.error(`Method ${attempt.name} failed:`, error?.message || error);
}
```

`.env.local`でデバッグモードを有効化：
```env
NEXT_PUBLIC_DEBUG_MODE=true
```

### テスト環境特有のエラー

#### "Execution Reverted" エラー
テスト環境では以下のエラーが頻繁に発生します：
```
Method mintTo (basic ERC1155) failed: "Execution Reverted: {\"code\":3,\"message\":\"execution reverted\",\"data\":\"0x\"}"
```

**原因**: テスト環境のコントラクトにクレーム条件が設定されていない

**対処法**:
1. Thirdwebダッシュボードでクレーム条件を設定
2. または、テスト用のモックコントラクトを使用
3. `IS_TEST_ENVIRONMENT=true`でテストモードを有効化

### トラブルシューティング

#### よくある問題と解決方法

1. **価格が「無料」と表示される**
   - Thirdwebのクレーム条件を確認
   - 管理パネルでカスタム価格を設定

2. **「アローリスト未登録」エラー**
   - 無制限販売が有効か確認
   - アローリストの設定を確認

3. **ウォレット制限エラー**
   - maxPerWallet設定を確認
   - ユーザーの現在の保有数を確認

### ログレベルの管理

開発段階に応じて以下のログレベルを使い分けることを推奨：

- **開発環境**: 全てのconsole.errorを有効化
- **ステージング環境**: 重要なエラーのみ有効化
- **本番環境**: 全てのconsole.errorを無効化

### パフォーマンスへの影響

console.error文を有効にすると以下の影響があります：
- ページロード時間が若干増加
- メモリ使用量が増加
- ブラウザコンソールが煩雑になる

本番環境では必ず無効化してください。

## サポート

デバッグで解決できない問題が発生した場合は、以下の情報と共に報告してください：

1. エラーメッセージの全文
2. 実行環境（ブラウザ、OS）
3. ウォレットの種類
4. 再現手順
5. ネットワーク（Polygon Mainnet/Mumbai Testnet）