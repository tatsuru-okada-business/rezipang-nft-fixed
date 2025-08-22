# 🚨 本番デプロイ前のクリーンアップチェックリスト

## ⚠️ 重要: 本番環境にデプロイする前に必ず実行してください

---

## 1. 削除すべきデバッグ機能

### 1.1 DebugInfo コンポーネント（エラー報告用ボタン）
**ファイル**: `components/DebugInfo.tsx`
```bash
# このファイルを完全に削除
rm components/DebugInfo.tsx
```

**関連する削除箇所**:
- `app/[locale]/page.tsx` から以下を削除:
  ```tsx
  // 削除する行
  import { DebugInfo } from "@/components/DebugInfo";
  
  // 削除する行（JSX内）
  {isFeatureEnabled('showDebugInfo') && <DebugInfo locale={locale} />}
  ```

### 1.2 デバッグ用のconsole.log
**対象ファイル**: `components/SimpleMint.tsx`

削除すべきconsole.log:
- 212行目付近: `console.log("Mint Details:", {...})`
- 228行目付近: `console.log("🔄 Trying SDK v5 claimTo for DropERC1155...")`
- 229-234行目: パラメータログ
- 241行目: 成功ログ
- 247行目: エラーログ
- 253行目: フォールバックログ
- 各mintAttemptsループ内のログ（283行目以降）

### 1.3 エラー詳細表示のデバッグセクション
**ファイル**: `components/SimpleMint.tsx`

500-510行目付近の詳細デバッグ情報表示を簡略化:
```tsx
// 現在のデバッグ版を削除
<details className="mt-2">
  <summary className="cursor-pointer text-xs underline">
    {locale === "ja" ? "詳細情報" : "Debug Info"}
  </summary>
  <div className="text-xs mt-1 font-mono bg-white p-2 rounded">
    ...
  </div>
</details>
```

---

## 2. 設定ファイルの調整

### 2.1 project.config.js
```javascript
features: {
  showTokenGallery: false,
  showPriceChecker: false,
  showMintSimulator: false,
  showDebugInfo: false,  // ← 必ずfalseに設定
  maxMintPerWallet: true
}
```

### 2.2 環境変数の確認
**ファイル**: `.env.local`
```bash
# 削除すべき項目
THIRDWEB_SECRET_KEY  # ← Vercelの環境変数のみに設定（ローカルファイルから削除）
```

---

## 3. テスト用ファイルの削除

```bash
# テスト関連ファイルを削除
rm TEST_CHECKLIST.md
rm CLEANUP_BEFORE_PRODUCTION.md  # このファイル自体も削除
rm -rf test/
rm -rf scripts/test-*.js
```

---

## 4. ログ出力の最小化

### 4.1 エラーメッセージの簡略化
**ファイル**: `components/SimpleMint.tsx`

詳細なエラースタックトレースを削除し、ユーザーフレンドリーなメッセージのみ表示:
```typescript
// Before (デバッグ版)
setMintError(
  locale === "ja" 
    ? `ミントに失敗しました。\n試した方法: ${attemptedMethods.join(", ")}\n詳細: ${errorDetails}` 
    : `Mint failed.\nMethods tried: ${attemptedMethods.join(", ")}\nDetails: ${errorDetails}`
);

// After (本番版)
setMintError(
  locale === "ja" 
    ? "ミントに失敗しました。もう一度お試しください。" 
    : "Mint failed. Please try again."
);
```

---

## 5. コマンド実行手順

```bash
# 1. デバッグファイルを削除
rm components/DebugInfo.tsx
rm TEST_CHECKLIST.md
rm CLEANUP_BEFORE_PRODUCTION.md

# 2. console.logを一括削除（SimpleMint.tsx内）
# VSCodeで検索: console\.(log|error|warn)
# 正規表現モードで一括削除

# 3. 設定を本番用に変更
# project.config.jsのshowDebugInfoをfalseに

# 4. 型チェック
pnpm run type-check

# 5. ビルド確認
pnpm run build

# 6. 最終確認
pnpm run dev
# ブラウザで動作確認

# 7. Git commit
git add -A
git commit -m "chore: 本番デプロイ用にデバッグ機能を削除"

# 8. デプロイ
git push origin main
```

---

## 6. 最終確認チェックリスト

- [ ] DebugInfo.tsxを削除した
- [ ] page.tsxからDebugInfoのインポートを削除した
- [ ] console.logをすべて削除した
- [ ] project.config.jsのshowDebugInfoをfalseにした
- [ ] .env.localからTHIRDWEB_SECRET_KEYを削除した
- [ ] エラーメッセージをユーザーフレンドリーに変更した
- [ ] pnpm run type-checkが成功した
- [ ] pnpm run buildが成功した
- [ ] ローカルで動作確認した

---

## ⚠️ 注意事項

1. **THIRDWEB_SECRET_KEY**は絶対にGitHubにコミットしない
2. Vercelの環境変数設定で本番環境のみに設定
3. デバッグ情報は開発環境のみで使用
4. 本番環境では最小限のエラー情報のみ表示

---

作成日: 2025年8月22日
作成者: Claude AI Assistant