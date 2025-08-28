const fs = require('fs');
const path = require('path');

// File paths
const adminConfigPath = path.join(process.cwd(), 'admin-config.json');
const localSettingsPath = path.join(process.cwd(), 'local-settings.json');

// Read admin-config.json
const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf-8'));

// Read or create local-settings.json
let localSettings = {
  defaultTokenId: 0,
  tokens: {},
  lastUpdated: new Date().toISOString()
};

if (fs.existsSync(localSettingsPath)) {
  localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
}

// Migrate sales period settings from admin-config to local-settings
adminConfig.tokens.forEach(token => {
  const tokenId = token.thirdweb.tokenId.toString();
  
  // Initialize token settings if not exists
  if (!localSettings.tokens[tokenId]) {
    localSettings.tokens[tokenId] = {
      displayEnabled: true,
      displayOrder: token.thirdweb.tokenId
    };
  }
  
  // Copy local settings from admin-config
  if (token.local) {
    localSettings.tokens[tokenId] = {
      ...localSettings.tokens[tokenId],
      displayEnabled: token.local.displayEnabled ?? true,
      displayOrder: token.local.displayOrder ?? token.thirdweb.tokenId,
      isDefaultDisplay: token.local.isDefaultDisplay ?? false,
      salesPeriodEnabled: token.local.salesPeriodEnabled ?? false,
      salesStartDate: token.local.salesStartDate,
      salesEndDate: token.local.salesEndDate,
      isUnlimited: token.local.isUnlimited ?? true,
      totalMinted: token.local.totalMinted ?? 0
    };
  }
});

// Update timestamp
localSettings.lastUpdated = new Date().toISOString();

// Save updated local-settings.json
fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));

console.log('✅ Migration completed successfully!');
console.log(`📁 Updated ${Object.keys(localSettings.tokens).length} tokens in local-settings.json`);

// Optional: Clean up admin-config.json by removing local settings
const cleanAdminConfig = {
  ...adminConfig,
  tokens: adminConfig.tokens.map(token => ({
    thirdweb: token.thirdweb
  }))
};

// Uncomment to clean admin-config.json
// fs.writeFileSync(adminConfigPath, JSON.stringify(cleanAdminConfig, null, 2));
// console.log('🧹 Cleaned up admin-config.json');