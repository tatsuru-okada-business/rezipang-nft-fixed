#!/bin/bash

# シンプルなテストスクリプト（テスト環境用）

set -e

echo "========================================="
echo "🚀 テスト環境用の簡易テスト"
echo "========================================="
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# サーバー確認
echo "📡 サーバー確認中..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ サーバーは起動しています${NC}"
else
    echo -e "${RED}❌ サーバーが起動していません${NC}"
    echo "pnpm dev でサーバーを起動してください"
    exit 1
fi

echo ""
echo "📊 APIテスト"
echo "================================"

# Token 0のテスト
echo "🔍 Token #0 のテスト"
response=$(curl -s "http://localhost:3001/api/tokens?tokenId=0")
name=$(echo "$response" | jq -r '.tokens[0].name')
price=$(echo "$response" | jq -r '.tokens[0].price')
currency=$(echo "$response" | jq -r '.tokens[0].currency')

if [ "$name" = "MINT-TEST-NFT" ] && [ "$price" = "1" ] && [ "$currency" = "ZENY" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: $name - $price $currency"
else
    echo -e "  ${RED}❌ FAIL${NC}: 期待値と異なります"
    echo "    実際: $name - $price $currency"
    echo "    期待: MINT-TEST-NFT - 1 ZENY"
fi

echo ""
echo "⚙️ 設定ファイル確認"
echo "================================"

# admin-config.json
if [ -f "admin-config.json" ]; then
    echo -e "  ${GREEN}✅ admin-config.json 存在${NC}"
else
    echo -e "  ${RED}❌ admin-config.json が見つかりません${NC}"
fi

# local-settings.json
if [ -f "local-settings.json" ]; then
    echo -e "  ${GREEN}✅ local-settings.json 存在${NC}"
else
    echo -e "  ${RED}❌ local-settings.json が見つかりません${NC}"
fi

# project-settings.json
if [ -f "project-settings.json" ]; then
    echo -e "  ${GREEN}✅ project-settings.json 存在${NC}"
    
    # カラー設定の確認
    bg_color=$(jq -r '.ui.theme.backgroundColor' project-settings.json)
    text_color=$(jq -r '.ui.theme.textColor' project-settings.json)
    
    echo "    背景色: $bg_color"
    echo "    文字色: $text_color"
else
    echo -e "  ${YELLOW}⚠️ project-settings.json が見つかりません（管理パネルで作成されます）${NC}"
fi

echo ""
echo "🌐 ページアクセステスト"
echo "================================"

# メインページ
if curl -s http://localhost:3001/ja | grep -q "限定NFTミント" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ メインページ (日本語)${NC}"
else
    echo -e "  ${RED}❌ メインページ読み込み失敗${NC}"
fi

# Admin画面
if curl -s http://localhost:3001/admin | grep -q "管理" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Admin画面${NC}"
else
    echo -e "  ${RED}❌ Admin画面読み込み失敗${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✨ テスト完了！${NC}"
echo "========================================="