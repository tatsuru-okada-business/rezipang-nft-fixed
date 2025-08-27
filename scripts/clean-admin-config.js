const fs = require('fs');
const path = require('path');

// ファイルパス
const adminConfigPath = path.join(process.cwd(), 'admin-config.json');
const localSettingsPath = path.join(process.cwd(), 'local-settings.json');

// admin-config.jsonを読み込み
const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf-8'));

// localSettingsを読み込み
let localSettings = {
  defaultTokenId: 2,
  tokens: {},
  lastUpdated: new Date().toISOString()
};

if (fs.existsSync(localSettingsPath)) {
  localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
}

// admin-configから clean な構造を作成
const cleanAdminConfig = {
  contractAddress: adminConfig.contractAddress,
  lastSync: adminConfig.lastSync,
  tokens: []
};

// 各トークンを処理
adminConfig.tokens.forEach(token => {
  // thirdwebデータのみを保持
  cleanAdminConfig.tokens.push({
    thirdweb: token.thirdweb
  });
  
  // localデータがある場合はlocal-settingsに移動
  if (token.local) {
    const tokenId = token.thirdweb.tokenId.toString();
    localSettings.tokens[tokenId] = {
      ...localSettings.tokens[tokenId],
      ...token.local
    };
    // tokenIdとlastSyncTimeを削除（重複を避けるため）
    delete localSettings.tokens[tokenId].tokenId;
    delete localSettings.tokens[tokenId].lastSyncTime;
  }
});

// ファイルを保存
fs.writeFileSync(adminConfigPath, JSON.stringify(cleanAdminConfig, null, 2));
fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));

console.log('✅ admin-config.json cleaned');
console.log('✅ local-settings.json updated');
console.log(`📊 Processed ${cleanAdminConfig.tokens.length} tokens`);