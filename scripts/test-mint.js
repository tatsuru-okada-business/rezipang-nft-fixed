/**
 * MINTサイトの動作確認スクリプト
 * 
 * 実行方法:
 * node scripts/test-mint.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  // ローカルテスト
  local: {
    url: 'http://localhost:3000',
    name: 'ローカル環境'
  },
  // Vercelデフォルトドメイン
  vercel: {
    url: 'https://rezipang-nfts-mint.vercel.app', // 実際のURLに変更してください
    name: 'Vercel環境'
  }
};

// テストするウォレットアドレス（allowlist.csvから取得）
const TEST_WALLETS = [
  '0x3f64bD02365F47eeC24c82CE5829eeb9489E8665', // アローリスト登録済み（2枚）
  '0x72182aF98F83d3b97A727a95B8E7EA94b424107B', // アローリスト登録済み（1枚）
  '0x0000000000000000000000000000000000000000', // 未登録
];

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// APIエンドポイントのテスト
async function testAPI(baseUrl, endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const protocol = url.protocol === 'https:' ? https : require('http');
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// アローリストチェック
async function checkAllowlist(baseUrl, address) {
  log(`\n  アドレス: ${address}`, 'cyan');
  
  try {
    const result = await testAPI(baseUrl, '/api/verify-allowlist', 'POST', { address });
    
    if (result.status === 200) {
      const { isAllowlisted, maxMintAmount } = result.data;
      if (isAllowlisted) {
        log(`    ✅ アローリスト登録済み（最大${maxMintAmount}枚）`, 'green');
      } else {
        log(`    ❌ アローリスト未登録`, 'yellow');
      }
    } else {
      log(`    ⚠️  エラー: ステータスコード ${result.status}`, 'red');
    }
  } catch (error) {
    log(`    ⚠️  接続エラー: ${error.message}`, 'red');
  }
}

// トークン情報取得
async function checkTokens(baseUrl) {
  log('\n📦 トークン情報の取得テスト', 'bright');
  
  try {
    const result = await testAPI(baseUrl, '/api/tokens');
    
    if (result.status === 200) {
      const { tokens } = result.data;
      log(`  ✅ ${tokens.length}個のトークンを取得`, 'green');
      
      tokens.forEach(token => {
        log(`    - Token #${token.id}: ${token.name} (供給量: ${token.totalSupply || '不明'})`, 'cyan');
      });
    } else {
      log(`  ⚠️  エラー: ステータスコード ${result.status}`, 'red');
    }
  } catch (error) {
    log(`  ⚠️  接続エラー: ${error.message}`, 'red');
  }
}

// 環境変数チェック
function checkEnvVars() {
  log('\n🔧 環境変数の確認', 'bright');
  
  const envFile = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const lines = envContent.split('\n');
    
    const requiredVars = [
      'NEXT_PUBLIC_THIRDWEB_CLIENT_ID',
      'NEXT_PUBLIC_CONTRACT_ADDRESS',
      'NEXT_PUBLIC_CHAIN_ID',
      'NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS',
      'NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL',
      'NEXT_PUBLIC_MINT_PRICE'
    ];
    
    requiredVars.forEach(varName => {
      const found = lines.some(line => line.startsWith(varName));
      if (found) {
        log(`  ✅ ${varName}`, 'green');
      } else {
        log(`  ❌ ${varName} が見つかりません`, 'red');
      }
    });
  } else {
    log('  ⚠️  .env.local ファイルが見つかりません', 'red');
  }
}

// Vercelドメインの影響分析
function analyzeVercelDomain() {
  log('\n🌐 Vercelデフォルトドメインの影響分析', 'bright');
  
  log('\n  問題の可能性:', 'yellow');
  log('  1. MetaMaskのフィッシング検出', 'cyan');
  log('     - *.vercel.appドメインは開発用として認識される可能性');
  log('     - カスタムドメインの使用を推奨');
  
  log('\n  2. Thirdweb APIキーのドメイン制限', 'cyan');
  log('     - Thirdwebダッシュボードで以下を追加する必要:');
  log('       • rezipang-nfts-mint.vercel.app');
  log('       • *.vercel.app (開発用)');
  
  log('\n  3. CORSポリシー', 'cyan');
  log('     - クロスオリジンリクエストの制限');
  log('     - Next.jsのmiddleware.tsで設定可能');
  
  log('\n  推奨対策:', 'green');
  log('  1. カスタムドメインの設定（例: mint.rezipang.com）');
  log('  2. Thirdwebダッシュボードでドメイン許可');
  log('  3. 本番環境用の専用APIキーを使用');
}

// メインテスト実行
async function runTests() {
  log('='.repeat(60), 'bright');
  log('🚀 ReZipang NFT MINTサイト 動作確認スクリプト', 'bright');
  log('='.repeat(60), 'bright');
  
  // 環境変数チェック
  checkEnvVars();
  
  // 各環境でのテスト
  for (const [key, config] of Object.entries(CONFIG)) {
    log(`\n${'='.repeat(40)}`, 'bright');
    log(`📍 ${config.name} テスト`, 'bright');
    log(`   URL: ${config.url}`, 'cyan');
    log('='.repeat(40), 'bright');
    
    // サーバー接続確認
    log('\n🔌 サーバー接続確認', 'bright');
    try {
      const testUrl = key === 'local' ? 'http://localhost:3000' : config.url;
      await testAPI(testUrl, '/');
      log('  ✅ サーバーに接続成功', 'green');
      
      // トークン情報取得
      await checkTokens(testUrl);
      
      // アローリストチェック
      log('\n👥 アローリスト確認', 'bright');
      for (const address of TEST_WALLETS) {
        await checkAllowlist(testUrl, address);
      }
      
    } catch (error) {
      if (key === 'local') {
        log('  ⚠️  ローカルサーバーが起動していません', 'yellow');
        log('     pnpm run dev でサーバーを起動してください', 'cyan');
      } else {
        log(`  ❌ 接続エラー: ${error.message}`, 'red');
      }
    }
  }
  
  // Vercelドメインの影響分析
  analyzeVercelDomain();
  
  log('\n' + '='.repeat(60), 'bright');
  log('✨ テスト完了', 'bright');
  log('='.repeat(60), 'bright');
}

// 実行
runTests().catch(console.error);