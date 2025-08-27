#!/usr/bin/env node

/**
 * 開発サーバー起動スクリプト
 * ポートが使用中の場合は自動的に別のポートを探す
 */

const { spawn } = require('child_process');
const net = require('net');

// デフォルトポートと範囲
const DEFAULT_PORT = 3001;
const MAX_PORT = 3010;

/**
 * ポートが利用可能かチェック
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    // 0.0.0.0 でチェック（IPv4とIPv6の両方をカバー）
    server.listen(port, '0.0.0.0');
  });
}

/**
 * 利用可能なポートを探す
 */
async function findAvailablePort(startPort = DEFAULT_PORT, maxPort = MAX_PORT) {
  for (let port = startPort; port <= maxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    console.log(`✗ Port ${port} is already in use`);
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

/**
 * 開発サーバーを起動
 */
async function startDevServer() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    
    console.log(`✓ Using port ${port}`);
    console.log('🚀 Starting development server...\n');
    
    // Next.js開発サーバーを起動 (pnpmを使用)
    const nextDev = spawn('pnpm', ['exec', 'next', 'dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: false
    });
    
    // プロセス終了時のクリーンアップ
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development server...');
      nextDev.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      nextDev.kill('SIGTERM');
      process.exit(0);
    });
    
    nextDev.on('error', (error) => {
      console.error('Error starting dev server:', error);
      process.exit(1);
    });
    
    nextDev.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`Dev server exited with code ${code}`);
        process.exit(code);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// メイン実行
startDevServer();