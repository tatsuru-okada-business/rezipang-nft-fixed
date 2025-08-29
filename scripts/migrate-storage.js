const fs = require('fs');
const path = require('path');

// ファイルパス
const adminConfigPath = path.join(process.cwd(), 'admin-config.json');
const localSettingsPath = path.join(process.cwd(), 'local-settings.json');
const defaultTokenPath = path.join(process.cwd(), 'default-token.json');
const settingsPath = path.join(process.cwd(), 'settings.json');
const tokensCachePath = path.join(process.cwd(), 'tokens-cache.json');

function migrate() {
  console.log('Starting migration...');
  
  try {
    // 1. 新しい統合設定ファイルを作成
    const settings = {
      defaultTokenId: 0,
      lastSync: null,
      tokens: {}
    };
    
    // default-token.jsonから読み込み
    if (fs.existsSync(defaultTokenPath)) {
      const defaultToken = JSON.parse(fs.readFileSync(defaultTokenPath, 'utf-8'));
      settings.defaultTokenId = defaultToken.tokenId || 0;
      console.log(`Default token ID: ${settings.defaultTokenId}`);
    }
    
    // local-settings.jsonから読み込み
    if (fs.existsSync(localSettingsPath)) {
      const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
      settings.tokens = localSettings.tokens || {};
      settings.lastSync = localSettings.lastUpdated;
      console.log(`Loaded ${Object.keys(settings.tokens).length} token settings`);
    }
    
    // 2. トークンキャッシュを作成（admin-config.jsonから）
    const tokensCache = {
      lastUpdate: new Date().toISOString(),
      tokens: []
    };
    
    if (fs.existsSync(adminConfigPath)) {
      const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf-8'));
      
      // 有効なトークンのみを抽出（Token #Xを除外）
      tokensCache.tokens = adminConfig.tokens
        .filter(item => {
          return item.thirdweb && 
                 item.thirdweb.name && 
                 !item.thirdweb.name.match(/^Token #\d+$/);
        })
        .map(item => ({
          tokenId: item.thirdweb.tokenId,
          name: item.thirdweb.name,
          description: item.thirdweb.description || '',
          image: item.thirdweb.image || '',
          totalSupply: item.thirdweb.totalSupply || '0',
          price: parseFloat(item.thirdweb.currentPrice) || 0,
          currency: item.thirdweb.currency,
          currencySymbol: item.thirdweb.currency === 'ZENY' ? 'ZENY' : 
                          item.thirdweb.currency === 'USDC' ? 'USDC' : 
                          'POL',
          maxPerWallet: item.thirdweb.maxPerWallet,
          merkleRoot: item.thirdweb.merkleRoot,
          claimConditionActive: item.thirdweb.claimConditionActive || false
        }));
      
      tokensCache.lastUpdate = adminConfig.lastSync || new Date().toISOString();
      console.log(`Cached ${tokensCache.tokens.length} valid tokens`);
    }
    
    // 3. ファイルを保存
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✓ Created ${settingsPath}`);
    
    fs.writeFileSync(tokensCachePath, JSON.stringify(tokensCache, null, 2));
    console.log(`✓ Created ${tokensCachePath}`);
    
    // 4. 古いファイルのバックアップ
    const backupDir = path.join(process.cwd(), 'backup-json');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // バックアップ作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (fs.existsSync(adminConfigPath)) {
      fs.copyFileSync(adminConfigPath, path.join(backupDir, `admin-config-${timestamp}.json`));
      console.log('✓ Backed up admin-config.json');
    }
    
    if (fs.existsSync(localSettingsPath)) {
      fs.copyFileSync(localSettingsPath, path.join(backupDir, `local-settings-${timestamp}.json`));
      console.log('✓ Backed up local-settings.json');
    }
    
    if (fs.existsSync(defaultTokenPath)) {
      fs.copyFileSync(defaultTokenPath, path.join(backupDir, `default-token-${timestamp}.json`));
      console.log('✓ Backed up default-token.json');
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Old files have been backed up to ./backup-json/');
    console.log('\nNext steps:');
    console.log('1. Test the application');
    console.log('2. If everything works, you can delete the old JSON files');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 実行
migrate();