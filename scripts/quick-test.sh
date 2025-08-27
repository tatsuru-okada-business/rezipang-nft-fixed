#!/bin/bash

# クイックテストスクリプト（修正後の確認用）

set -e

echo "========================================="
echo "🚀 クイックテスト実行"
echo "========================================="
echo ""

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# サーバー起動（バックグラウンド）
echo "📡 開発サーバーを起動中..."
pnpm dev -p 3001 > /tmp/nextjs.log 2>&1 &
SERVER_PID=$!
echo "サーバーPID: $SERVER_PID"

# サーバー起動待機
echo "サーバーの起動を待機中..."
sleep 10

# APIテスト
echo ""
echo "📊 価格表示テスト"
echo "================================"

# Token 0: キンノカブ
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=0")
name=$(echo "$response" | jq -r '.tokens[0].name')
price=$(echo "$response" | jq -r '.tokens[0].price')
currency=$(echo "$response" | jq -r '.tokens[0].currency')
if [ "$price" = "67" ] && [ "$currency" = "USDC" ]; then
    echo -e "  ${GREEN}✅ Token 0 (キンノカブ): $price $currency${NC}"
else
    echo -e "  ${RED}❌ Token 0: 期待値 67 USDC, 実際 $price $currency${NC}"
fi

# Token 2: 純金のパスポート
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=2")
price=$(echo "$response" | jq -r '.tokens[0].price')
currency=$(echo "$response" | jq -r '.tokens[0].currency')
if [ "$price" = "1" ] && [ "$currency" = "ZENY" ]; then
    echo -e "  ${GREEN}✅ Token 2 (純金のパスポート): $price $currency${NC}"
else
    echo -e "  ${RED}❌ Token 2: 期待値 1 ZENY, 実際 $price $currency${NC}"
fi

# Token 4: ココホレ
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=4")
price=$(echo "$response" | jq -r '.tokens[0].price')
currency=$(echo "$response" | jq -r '.tokens[0].currency')
if [ "$price" = "5000" ] && [ "$currency" = "ZENY" ]; then
    echo -e "  ${GREEN}✅ Token 4 (ココホレ): $price $currency${NC}"
else
    echo -e "  ${RED}❌ Token 4: 期待値 5000 ZENY, 実際 $price $currency${NC}"
fi

echo ""
echo "🎨 販売期間テスト"
echo "================================"

# Token 1: 販売期間確認
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=1")
sales_enabled=$(echo "$response" | jq -r '.tokens[0].salesPeriodEnabled')
sales_end=$(echo "$response" | jq -r '.tokens[0].salesEndDate')
if [ "$sales_enabled" = "true" ]; then
    echo -e "  ${GREEN}✅ Token 1: 販売期間有効${NC}"
    echo "     終了: $sales_end"
else
    echo -e "  ${RED}❌ Token 1: 販売期間が無効${NC}"
fi

# Token 2: 販売期間確認
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=2")
sales_enabled=$(echo "$response" | jq -r '.tokens[0].salesPeriodEnabled')
if [ "$sales_enabled" = "true" ]; then
    echo -e "  ${GREEN}✅ Token 2: 販売期間有効${NC}"
else
    echo -e "  ${RED}❌ Token 2: 販売期間が無効${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✨ テスト完了！${NC}"
echo "========================================="

# サーバー停止
echo ""
echo "サーバーを停止します..."
kill $SERVER_PID 2>/dev/null || true
echo "サーバーを停止しました"