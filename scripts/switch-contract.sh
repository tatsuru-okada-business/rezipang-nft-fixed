#!/bin/bash

# コントラクト切り替えスクリプト
# 使用方法: ./scripts/switch-contract.sh test|prod

MODE=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="config-backup/${TIMESTAMP}"

# テスト用と本番用のコントラクトアドレス
TEST_CONTRACT="0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1"
PROD_CONTRACT="0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E"

# コントラクトごとの設定保存ディレクトリ
TEST_CONFIG_DIR="config-storage/test-contract"
PROD_CONFIG_DIR="config-storage/prod-contract"

if [ "$MODE" != "test" ] && [ "$MODE" != "prod" ]; then
    echo "使用方法: $0 test|prod"
    echo "  test - テスト用コントラクトに切り替え"
    echo "  prod - 本番用コントラクトに切り替え"
    exit 1
fi

echo "=== コントラクト切り替えスクリプト ==="
echo "モード: $MODE"
echo ""

# 現在のコントラクトを判定
CURRENT_CONTRACT=$(grep "^NEXT_PUBLIC_CONTRACT_ADDRESS=" .env.local | cut -d'=' -f2)
CURRENT_MODE=""
if [ "$CURRENT_CONTRACT" = "$TEST_CONTRACT" ]; then
    CURRENT_MODE="test"
elif [ "$CURRENT_CONTRACT" = "$PROD_CONTRACT" ]; then
    CURRENT_MODE="prod"
fi

# 1. 現在の設定を対応するディレクトリに保存
if [ ! -z "$CURRENT_MODE" ]; then
    echo "1. 現在の設定を保存中 ($CURRENT_MODE → config-storage/$CURRENT_MODE-contract)"
    
    if [ "$CURRENT_MODE" = "test" ]; then
        SAVE_DIR="$TEST_CONFIG_DIR"
    else
        SAVE_DIR="$PROD_CONFIG_DIR"
    fi
    
    mkdir -p "$SAVE_DIR"
    
    if [ -f "admin-config.json" ]; then
        cp admin-config.json "$SAVE_DIR/"
        echo "  ✓ admin-config.json を保存"
    fi
    
    if [ -f "local-settings.json" ]; then
        cp local-settings.json "$SAVE_DIR/"
        echo "  ✓ local-settings.json を保存"
    fi
    
    if [ -f "default-token.json" ]; then
        cp default-token.json "$SAVE_DIR/"
        echo "  ✓ default-token.json を保存"
    fi
    
    if [ -f "sale-config.json" ]; then
        cp sale-config.json "$SAVE_DIR/"
        echo "  ✓ sale-config.json を保存"
    fi
else
    echo "1. 現在のコントラクトが不明のため、バックアップを作成"
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "admin-config.json" ]; then
        cp admin-config.json "$BACKUP_DIR/"
        echo "  ✓ admin-config.json をバックアップ"
    fi
    
    if [ -f "local-settings.json" ]; then
        cp local-settings.json "$BACKUP_DIR/"
        echo "  ✓ local-settings.json をバックアップ"
    fi
    
    if [ -f "default-token.json" ]; then
        cp default-token.json "$BACKUP_DIR/"
        echo "  ✓ default-token.json をバックアップ"
    fi
    
    if [ -f "sale-config.json" ]; then
        cp sale-config.json "$BACKUP_DIR/"
        echo "  ✓ sale-config.json をバックアップ"
    fi
fi

echo ""

# 2. 切り替え先の設定を復元
echo "2. 切り替え先の設定を復元中..."

if [ "$MODE" = "test" ]; then
    RESTORE_DIR="$TEST_CONFIG_DIR"
    CONTRACT=$TEST_CONTRACT
else
    RESTORE_DIR="$PROD_CONFIG_DIR"
    CONTRACT=$PROD_CONTRACT
fi

if [ -d "$RESTORE_DIR" ] && [ "$(ls -A $RESTORE_DIR)" ]; then
    echo "  既存の設定が見つかりました: $RESTORE_DIR"
    
    if [ -f "$RESTORE_DIR/admin-config.json" ]; then
        cp "$RESTORE_DIR/admin-config.json" .
        echo "  ✓ admin-config.json を復元"
    fi
    
    if [ -f "$RESTORE_DIR/local-settings.json" ]; then
        cp "$RESTORE_DIR/local-settings.json" .
        echo "  ✓ local-settings.json を復元"
    fi
    
    if [ -f "$RESTORE_DIR/default-token.json" ]; then
        cp "$RESTORE_DIR/default-token.json" .
        echo "  ✓ default-token.json を復元"
    fi
    
    if [ -f "$RESTORE_DIR/sale-config.json" ]; then
        cp "$RESTORE_DIR/sale-config.json" .
        echo "  ✓ sale-config.json を復元"
    fi
else
    echo "  既存の設定が見つかりません。新規作成します。"
    
    # local-settings.jsonを初期化
    echo '{
  "defaultTokenId": 0,
  "tokens": {},
  "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
}' > local-settings.json
    echo "  ✓ local-settings.json を初期化"
    
    # default-token.jsonを初期化
    echo '{
  "tokenId": 0,
  "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
}' > default-token.json
    echo "  ✓ default-token.json を初期化"
fi

echo ""

# 3. .env.localの確認（更新はしない）
echo "3. 現在の .env.local の設定を確認中..."
CURRENT_ENV_CONTRACT=$(grep "^NEXT_PUBLIC_CONTRACT_ADDRESS=" .env.local | cut -d'=' -f2)
echo "  現在のコントラクト: $CURRENT_ENV_CONTRACT"

if [ "$MODE" = "test" ] && [ "$CURRENT_ENV_CONTRACT" != "$TEST_CONTRACT" ]; then
    echo "  ⚠️  警告: .env.local がテスト用に設定されていません"
    echo "  以下のように手動で設定してください:"
    echo ""
    echo "  # テスト用"
    echo "  NEXT_PUBLIC_CONTRACT_ADDRESS=$TEST_CONTRACT"
    echo "  # 本番用"
    echo "  # NEXT_PUBLIC_CONTRACT_ADDRESS=$PROD_CONTRACT"
elif [ "$MODE" = "prod" ] && [ "$CURRENT_ENV_CONTRACT" != "$PROD_CONTRACT" ]; then
    echo "  ⚠️  警告: .env.local が本番用に設定されていません"
    echo "  以下のように手動で設定してください:"
    echo ""
    echo "  # テスト用"
    echo "  # NEXT_PUBLIC_CONTRACT_ADDRESS=$TEST_CONTRACT"
    echo "  # 本番用"
    echo "  NEXT_PUBLIC_CONTRACT_ADDRESS=$PROD_CONTRACT"
else
    echo "  ✓ .env.local は正しく設定されています"
fi

# 4. 現在のコントラクトに応じてコードを更新
echo ""
echo "4. コードの設定を更新中..."

# 現在のコントラクトアドレスに応じて設定
if [ "$CURRENT_ENV_CONTRACT" = "$TEST_CONTRACT" ]; then
    echo "  テスト環境として設定中..."
    
    # thirdwebAllowlist.tsを更新
    ALLOWLIST_FILE="lib/thirdwebAllowlist.ts"
    if [ -f "$ALLOWLIST_FILE" ]; then
        # macOS/Linux互換でファイルを更新
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - テストコントラクトアドレスを埋め込む
            sed -i '' "s/contractAddress\.toLowerCase() === \"0x[a-fA-F0-9]\{40\}\"\.toLowerCase()/contractAddress.toLowerCase() === \"$TEST_CONTRACT\".toLowerCase()/" "$ALLOWLIST_FILE"
        else
            # Linux
            sed -i "s/contractAddress\.toLowerCase() === \"0x[a-fA-F0-9]\{40\}\"\.toLowerCase()/contractAddress.toLowerCase() === \"$TEST_CONTRACT\".toLowerCase()/" "$ALLOWLIST_FILE"
        fi
        echo "  ✓ thirdwebAllowlist.ts を更新（テストコントラクト: $TEST_CONTRACT）"
    fi
    
    # 環境変数も自動設定
    if grep -q "^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=" .env.local; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=.*/NEXT_PUBLIC_USE_CSV_FOR_MERKLE=true/" .env.local
        else
            sed -i "s/^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=.*/NEXT_PUBLIC_USE_CSV_FOR_MERKLE=true/" .env.local
        fi
    else
        echo "NEXT_PUBLIC_USE_CSV_FOR_MERKLE=true" >> .env.local
    fi
    echo "  ✓ CSV for Merkle を有効化"
    
elif [ "$CURRENT_ENV_CONTRACT" = "$PROD_CONTRACT" ]; then
    echo "  本番環境として設定中..."
    
    # 本番環境の場合、CSV for Merkleを無効化
    if grep -q "^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=" .env.local; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=.*/NEXT_PUBLIC_USE_CSV_FOR_MERKLE=false/" .env.local
        else
            sed -i "s/^NEXT_PUBLIC_USE_CSV_FOR_MERKLE=.*/NEXT_PUBLIC_USE_CSV_FOR_MERKLE=false/" .env.local
        fi
    else
        echo "NEXT_PUBLIC_USE_CSV_FOR_MERKLE=false" >> .env.local
    fi
    echo "  ✓ CSV for Merkle を無効化（SDK v5 の自動処理を使用）"
else
    echo "  ⚠️  警告: 認識できないコントラクトアドレスです: $CURRENT_ENV_CONTRACT"
fi

echo ""
echo "=== 設定完了 ==="
echo "現在のコントラクト: $CURRENT_ENV_CONTRACT"
if [ "$CURRENT_ENV_CONTRACT" = "$TEST_CONTRACT" ]; then
    echo "環境: テスト"
    echo "アローリスト: CSV ベース（allowlist.csv）"
elif [ "$CURRENT_ENV_CONTRACT" = "$PROD_CONTRACT" ]; then
    echo "環境: 本番"
    echo "アローリスト: Thirdweb Dashboard"
fi
echo ""

# 設定ファイルの状態を表示
echo "📁 設定ファイルの状態:"
echo ""
echo "【local-settings.json】"
if [ -f "local-settings.json" ]; then
    echo "  トークン数: $(grep -o '"[0-9]\+"' local-settings.json | wc -l | xargs)"
    echo "  デフォルトトークンID: $(grep '"defaultTokenId"' local-settings.json | grep -o '[0-9]\+')"
fi

echo ""
echo "【default-token.json】"
if [ -f "default-token.json" ]; then
    echo "  トークンID: $(grep '"tokenId"' default-token.json | grep -o '[0-9]\+' | head -1)"
fi

echo ""
echo "【admin-config.json】"
if [ -f "admin-config.json" ]; then
    echo "  存在: ✓"
    TOKEN_COUNT=$(grep -o '"tokenId"' admin-config.json | wc -l | xargs)
    echo "  トークン数: $TOKEN_COUNT"
else
    echo "  存在: ✗ (同期が必要)"
fi

echo ""
echo "📝 次の手順:"
echo "1. 開発サーバーを再起動: npm run dev"
if [ ! -f "admin-config.json" ] || [ "$TOKEN_COUNT" = "0" ]; then
    echo "2. 管理画面で同期: http://localhost:3001/admin"
    echo "3. 'Sync from Thirdweb' ボタンをクリック"
fi
echo ""
echo "💾 保存された設定:"
echo "  テスト用: config-storage/test-contract/"
echo "  本番用: config-storage/prod-contract/"
echo ""