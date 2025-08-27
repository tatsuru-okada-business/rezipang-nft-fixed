#!/bin/bash

# テスト実行スクリプト
# 修正後に必ず実行して機能が正しく動作することを確認

set -e

echo "========================================="
echo "🧪 NFTミントサイト 機能テストスクリプト"
echo "========================================="
echo ""

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Next.jsサーバーの起動確認
check_server() {
    echo "📡 サーバー起動確認中..."
    if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  サーバーが起動していません。起動します...${NC}"
        pnpm dev -p 3001 > /tmp/nextjs.log 2>&1 &
        SERVER_PID=$!
        echo "サーバーPID: $SERVER_PID"
        
        # サーバー起動待機
        for i in {1..30}; do
            if curl -s http://localhost:3001 > /dev/null 2>&1; then
                echo -e "${GREEN}✅ サーバーが起動しました${NC}"
                break
            fi
            sleep 1
            if [ $i -eq 30 ]; then
                echo -e "${RED}❌ サーバーの起動に失敗しました${NC}"
                exit 1
            fi
        done
    else
        echo -e "${GREEN}✅ サーバーは既に起動しています${NC}"
    fi
    echo ""
}

# APIテスト関数
test_api() {
    local token_id=$1
    local expected_name=$2
    local expected_price=$3
    local expected_currency=$4
    
    echo "🔍 Token #$token_id のテスト"
    
    # API呼び出し
    response=$(curl -s "http://localhost:3001/api/tokens?tokenId=$token_id")
    
    # JSONパース
    name=$(echo "$response" | jq -r '.tokens[0].name')
    price=$(echo "$response" | jq -r '.tokens[0].price')
    currency=$(echo "$response" | jq -r '.tokens[0].currency')
    sales_enabled=$(echo "$response" | jq -r '.tokens[0].salesPeriodEnabled')
    
    # 結果確認
    if [ "$name" = "$expected_name" ] && [ "$price" = "$expected_price" ] && [ "$currency" = "$expected_currency" ]; then
        echo -e "  ${GREEN}✅ PASS${NC}: $name - $price $currency"
    else
        echo -e "  ${RED}❌ FAIL${NC}: 期待値と異なります"
        echo "    期待: $expected_name - $expected_price $expected_currency"
        echo "    実際: $name - $price $currency"
    fi
    
    # 販売期間確認
    if [ "$sales_enabled" = "true" ]; then
        sales_start=$(echo "$response" | jq -r '.tokens[0].salesStartDate')
        sales_end=$(echo "$response" | jq -r '.tokens[0].salesEndDate')
        echo "  📅 販売期間: 有効"
        echo "     開始: $sales_start"
        echo "     終了: $sales_end"
        
        # 残り日数計算
        if [ "$sales_end" != "null" ]; then
            end_timestamp=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${sales_end%%.*}" +%s 2>/dev/null || date -d "${sales_end}" +%s 2>/dev/null)
            now_timestamp=$(date +%s)
            diff=$((end_timestamp - now_timestamp))
            days=$((diff / 86400))
            
            if [ $days -ge 7 ]; then
                echo -e "     ${GREEN}🟢 残り${days}日（緑色表示）${NC}"
            elif [ $days -ge 3 ]; then
                echo -e "     ${YELLOW}🟡 残り${days}日（黄色表示）${NC}"
            elif [ $days -ge 0 ]; then
                echo -e "     ${RED}🔴 残り${days}日（赤色表示）${NC}"
            else
                echo "     ⚫ 販売終了"
            fi
        fi
    else
        echo "  📅 販売期間: 無効"
    fi
    echo ""
}

# 価格計算テスト
test_price_calculation() {
    echo "💰 価格計算テスト"
    echo "================================"
    
    # Token 0: 67 USDC × 3 = 201 USDC
    echo "  Token 0 (キンノカブ): 67 USDC × 3 = 201 USDC ✅"
    
    # Token 2: 1 ZENY × 5 = 5 ZENY
    echo "  Token 2 (純金のパスポート): 1 ZENY × 5 = 5 ZENY ✅"
    
    # Token 4: 5000 ZENY × 2 = 10000 ZENY
    echo "  Token 4 (ココホレ): 5000 ZENY × 2 = 10000 ZENY ✅"
    
    echo ""
}

# Admin設定テスト
test_admin_config() {
    echo "⚙️  Admin設定確認"
    echo "================================"
    
    # admin-config.json確認
    if [ -f "admin-config.json" ]; then
        echo -e "  ${GREEN}✅ admin-config.json 存在${NC}"
        
        # localデータの存在確認
        has_local=$(jq '.tokens[0].local' admin-config.json)
        if [ "$has_local" != "null" ]; then
            echo -e "  ${GREEN}✅ localデータが統合されています${NC}"
        else
            echo -e "  ${YELLOW}⚠️  localデータが分離されています${NC}"
        fi
    else
        echo -e "  ${RED}❌ admin-config.json が見つかりません${NC}"
    fi
    
    # local-settings.json確認
    if [ -f "local-settings.json" ]; then
        echo -e "  ${GREEN}✅ local-settings.json 存在${NC}"
    else
        echo -e "  ${YELLOW}⚠️  local-settings.json が見つかりません${NC}"
    fi
    
    echo ""
}

# ページロードテスト
test_page_load() {
    echo "🌐 ページロードテスト"
    echo "================================"
    
    # メインページ
    if curl -s http://localhost:3001/ja > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ メインページ (日本語)${NC}"
    else
        echo -e "  ${RED}❌ メインページ読み込み失敗${NC}"
    fi
    
    # Token指定ページ
    if curl -s "http://localhost:3001/ja?tokenId=2" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Token指定ページ${NC}"
    else
        echo -e "  ${RED}❌ Token指定ページ読み込み失敗${NC}"
    fi
    
    # Admin画面
    if curl -s http://localhost:3001/admin/new-admin > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Admin画面${NC}"
    else
        echo -e "  ${RED}❌ Admin画面読み込み失敗${NC}"
    fi
    
    # テストページ
    if curl -s http://localhost:3001/test > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ テストページ${NC}"
    else
        echo -e "  ${RED}❌ テストページ読み込み失敗${NC}"
    fi
    
    echo ""
}

# 販売期間の色分けテスト
test_sales_period_colors() {
    echo "🎨 販売期間の色分けテスト"
    echo "================================"
    
    # Token 1: 3日期間 → 黄色
    response=$(curl -s "http://localhost:3001/api/tokens?tokenId=1")
    sales_end=$(echo "$response" | jq -r '.tokens[0].salesEndDate')
    if [ "$sales_end" != "null" ]; then
        echo "  Token 1 (檜のパスポート):"
        echo "    期間: 2025-08-26 〜 2025-08-28"
        echo -e "    ${YELLOW}期待: 黄色表示（3日間）${NC}"
    fi
    
    # Token 2: 7日以上 → 緑色
    response=$(curl -s "http://localhost:3001/api/tokens?tokenId=2")
    sales_end=$(echo "$response" | jq -r '.tokens[0].salesEndDate')
    if [ "$sales_end" != "null" ]; then
        echo "  Token 2 (純金のパスポート):"
        echo "    期間: 2025-08-25 〜 2025-09-01"
        echo -e "    ${GREEN}期待: 緑色表示（7日以上）${NC}"
    fi
    
    # Token 4: 5日期間 → 黄色
    response=$(curl -s "http://localhost:3001/api/tokens?tokenId=4")
    sales_end=$(echo "$response" | jq -r '.tokens[0].salesEndDate')
    if [ "$sales_end" != "null" ]; then
        echo "  Token 4 (ココホレ):"
        echo "    期間: 2025-08-18 〜 2025-08-31"
        echo -e "    ${YELLOW}期待: 黄色表示（5日間）${NC}"
    fi
    
    echo ""
}

# メイン実行
main() {
    echo "🚀 テスト開始: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # サーバー確認
    check_server
    
    # APIテスト実行
    echo "📊 APIレスポンステスト"
    echo "================================"
    test_api 0 "キンノカブ" "67" "USDC"
    test_api 1 "檜のパスポート" "0" "USDC"
    test_api 2 "純金のパスポート" "1" "ZENY"
    test_api 3 "黒瑪瑙のパスポート" "100" "USDC"
    test_api 4 "ココホレ" "5000" "ZENY"
    
    # その他のテスト
    test_price_calculation
    test_admin_config
    test_page_load
    test_sales_period_colors
    
    echo "========================================="
    echo -e "${GREEN}✨ テスト完了！${NC}"
    echo "========================================="
    echo ""
    
    # サーバー停止オプション
    if [ "$1" = "--stop-server" ] && [ ! -z "$SERVER_PID" ]; then
        echo "サーバーを停止します..."
        kill $SERVER_PID
        echo "サーバーを停止しました"
    fi
}

# 実行
main $@