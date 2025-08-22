/**
 * 画像読み込みテストスクリプト
 * IPFSおよびThirdweb CDNからの画像取得を確認
 */

const https = require('https');
const http = require('http');

// テスト対象のトークン
const TEST_TOKENS = [
  { id: 0, name: 'キンノカブ', image: 'ipfs://QmbUrvhd9bTzorkgMffnbhPkPCLLJtTz1kk4SdFXAyHHts/0.png' },
  { id: 2, name: '純金のパスポート', image: 'ipfs://QmbUrvhd9bTzorkgMffnbhPkPCLLJtTz1kk4SdFXAyHHts/2.png' },
];

// IPFSゲートウェイのリスト
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://w3s.link/ipfs/',
];

// 色付きコンソール
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// URLの存在確認
async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve({ success: true, status: res.statusCode });
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        // リダイレクト
        resolve({ success: true, status: res.statusCode, redirect: res.headers.location });
      } else {
        resolve({ success: false, status: res.statusCode });
      }
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// ThirdwebのAPIから画像URLを取得
async function getThirdwebImageUrl(tokenId) {
  const apiUrl = 'http://localhost:3000/api/tokens';
  
  return new Promise((resolve, reject) => {
    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const token = result.tokens.find(t => t.id === tokenId);
          resolve(token?.image || null);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// メインテスト
async function runImageTests() {
  log('='.repeat(60), 'bright');
  log('🖼️  NFT画像読み込みテスト', 'bright');
  log('='.repeat(60), 'bright');
  
  // 1. APIから画像URLを取得
  log('\n📡 APIから画像URL取得テスト', 'bright');
  for (const token of TEST_TOKENS) {
    try {
      const imageUrl = await getThirdwebImageUrl(token.id);
      if (imageUrl) {
        log(`  ✅ Token #${token.id}: ${imageUrl}`, 'green');
      } else {
        log(`  ❌ Token #${token.id}: 画像URLが見つかりません`, 'red');
      }
    } catch (error) {
      log(`  ❌ Token #${token.id}: API エラー - ${error.message}`, 'red');
    }
  }
  
  // 2. IPFSゲートウェイのテスト
  log('\n🌐 IPFSゲートウェイ接続テスト', 'bright');
  
  for (const token of TEST_TOKENS) {
    const ipfsHash = token.image.replace('ipfs://', '');
    log(`\n  Token #${token.id} (${token.name}):`, 'cyan');
    
    for (const gateway of IPFS_GATEWAYS) {
      const url = gateway + ipfsHash;
      const result = await checkUrl(url);
      
      if (result.success) {
        if (result.redirect) {
          log(`    ✅ ${gateway.replace('https://', '')} - リダイレクト (${result.status})`, 'yellow');
        } else {
          log(`    ✅ ${gateway.replace('https://', '')} - 成功 (${result.status})`, 'green');
        }
      } else {
        const errorMsg = result.error || `Status: ${result.status}`;
        log(`    ❌ ${gateway.replace('https://', '')} - ${errorMsg}`, 'red');
      }
    }
  }
  
  // 3. Thirdweb設定の確認
  log('\n⚙️  Thirdweb設定の推奨事項', 'bright');
  log('\n  Thirdwebダッシュボードの「Allowed Domains」に以下を追加:', 'cyan');
  log('    • rezipang-nfts.vercel.app', 'reset');
  log('    • rezipang-nfts-*.vercel.app (プレビュー環境用)', 'reset');
  log('    • localhost:3000 (開発環境用)', 'reset');
  log('    • *.ipfs.io (IPFS画像用)', 'reset');
  log('    • *.pinata.cloud (Pinata IPFS用)', 'reset');
  
  log('\n  ⚠️  注意:', 'yellow');
  log('    アスタリスク(*)を削除してVercelドメインのみにした場合、', 'reset');
  log('    IPFSゲートウェイからの画像読み込みがブロックされる可能性があります。', 'reset');
  
  log('\n' + '='.repeat(60), 'bright');
  log('✨ テスト完了', 'bright');
  log('='.repeat(60), 'bright');
}

// 実行
runImageTests().catch(console.error);