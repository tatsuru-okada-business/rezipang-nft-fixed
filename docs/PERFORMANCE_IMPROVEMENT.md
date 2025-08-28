# パフォーマンス改善ガイド

## 現在実施した改善

### 1. ローディング状態の最適化
- トークン選択時の不要なローディング状態を削除
- useEffectでのローディング管理を改善
- クリーンアップ処理を追加

### 2. カウントダウン更新頻度の削減
- 30秒→60秒に変更してCPU負荷を軽減

### 3. API呼び出しのデバウンス処理
- 100msの遅延を追加して連続的なAPI呼び出しを防止

## 追加の改善提案

### 1. React.memoの活用
```typescript
// SimpleMintコンポーネントは既にmemo化済み
export const SimpleMint = memo(SimpleMintComponent);
```

### 2. useMemoの活用
価格計算やボタンの無効化条件など、頻繁に再計算される値をメモ化：
```typescript
const isSaleDisabled = useMemo(() => {
  return !salesPeriod.enabled || 
    (salesPeriod.enabled && !salesPeriod.isUnlimited && !salesPeriod.start && !salesPeriod.end);
}, [salesPeriod]);
```

### 3. useCallbackの活用
イベントハンドラーをメモ化して再レンダリングを削減：
```typescript
const handleMint = useCallback(async () => {
  // ミント処理
}, [必要な依存関係]);
```

### 4. 画像の最適化
- next/imageを使用して画像を最適化
- lazy loadingの実装
- 適切なサイズの画像を使用

### 5. バンドルサイズの削減
- 不要なインポートの削除
- 動的インポートの活用
- Tree shakingの最適化

### 6. APIキャッシュの実装
```typescript
// SWRやReact Queryの使用を検討
import useSWR from 'swr';

const { data, error } = useSWR(
  `/api/tokens?tokenId=${tokenId}`,
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  }
);
```

### 7. 環境変数の最適化
- 必要な環境変数のみをクライアントに送信
- NEXT_PUBLIC_プレフィックスの適切な使用

### 8. ビルド最適化
```json
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

## パフォーマンス測定

### Lighthouse スコアの確認
```bash
npm run build
npm start
# Chromeの開発者ツールでLighthouseを実行
```

### バンドルサイズの分析
```bash
npm install --save-dev @next/bundle-analyzer
```

### 実装優先度
1. **高**: API呼び出しの最適化（SWR導入）
2. **高**: 画像の最適化
3. **中**: useMemo/useCallbackの追加
4. **低**: バンドル最適化

## 注意事項
- パフォーマンス改善は段階的に実施
- 各改善後に動作確認を実施
- ユーザー体験を最優先に考慮