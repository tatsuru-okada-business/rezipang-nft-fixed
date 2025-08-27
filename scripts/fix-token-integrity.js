#!/usr/bin/env node

/**
 * local-settings.jsonとdefault-token.jsonの整合性を修正するスクリプト
 */

const fs = require('fs');
const path = require('path');

const LOCAL_SETTINGS_PATH = path.join(process.cwd(), 'local-settings.json');
const DEFAULT_TOKEN_PATH = path.join(process.cwd(), 'default-token.json');
const ADMIN_CONFIG_PATH = path.join(process.cwd(), 'admin-config.json');

function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (error) {
    console.error(`Error loading ${filepath}:`, error);
    return null;
  }
}

function saveJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Updated ${filepath}`);
  } catch (error) {
    console.error(`Error saving ${filepath}:`, error);
  }
}

function fixTokenIntegrity() {
  console.log('🔧 Starting token integrity fix...\n');

  // 1. Load all configuration files
  const localSettings = loadJSON(LOCAL_SETTINGS_PATH) || {
    defaultTokenId: 0,
    tokens: {},
    lastUpdated: new Date().toISOString()
  };
  
  const defaultToken = loadJSON(DEFAULT_TOKEN_PATH);
  const adminConfig = loadJSON(ADMIN_CONFIG_PATH);

  console.log('Current state:');
  console.log(`- local-settings.json defaultTokenId: ${localSettings.defaultTokenId}`);
  console.log(`- default-token.json tokenId: ${defaultToken?.tokenId || 'not set'}`);
  console.log(`- Tokens in local-settings: ${Object.keys(localSettings.tokens).join(', ') || 'none'}`);
  console.log('');

  // 2. Determine valid token IDs
  const validTokenIds = [];
  
  // From local-settings tokens
  Object.keys(localSettings.tokens).forEach(id => {
    validTokenIds.push(parseInt(id));
  });

  // From admin-config tokens
  if (adminConfig && adminConfig.tokens) {
    adminConfig.tokens.forEach(token => {
      const tokenId = token.thirdweb?.tokenId;
      if (tokenId !== undefined && !validTokenIds.includes(tokenId)) {
        validTokenIds.push(tokenId);
      }
    });
  }

  console.log(`Valid token IDs found: ${validTokenIds.join(', ') || 'none'}`);
  console.log('');

  // 3. Check if defaultTokenId is valid
  const currentDefaultId = localSettings.defaultTokenId;
  const isValidDefault = validTokenIds.includes(currentDefaultId);

  if (!isValidDefault) {
    console.log(`⚠️  Current defaultTokenId (${currentDefaultId}) is invalid!`);
    
    // Find a new default
    let newDefaultId = null;
    
    // First, check for isDefaultDisplay flag
    for (const [id, token] of Object.entries(localSettings.tokens)) {
      if (token.isDefaultDisplay) {
        newDefaultId = parseInt(id);
        console.log(`Found token with isDefaultDisplay=true: ${newDefaultId}`);
        break;
      }
    }

    // If not found, use first valid token
    if (newDefaultId === null && validTokenIds.length > 0) {
      newDefaultId = validTokenIds[0];
      console.log(`Using first valid token as default: ${newDefaultId}`);
    }

    // Update defaultTokenId
    if (newDefaultId !== null) {
      localSettings.defaultTokenId = newDefaultId;
      console.log(`✅ Fixed defaultTokenId to ${newDefaultId}`);
      
      // Ensure the token entry exists in local-settings
      if (!localSettings.tokens[newDefaultId.toString()]) {
        localSettings.tokens[newDefaultId.toString()] = {
          displayEnabled: true,
          displayOrder: newDefaultId,
          isDefaultDisplay: true
        };
        console.log(`✅ Created token entry for ${newDefaultId}`);
      } else {
        // Update isDefaultDisplay flag
        localSettings.tokens[newDefaultId.toString()].isDefaultDisplay = true;
      }
      
      // Clear isDefaultDisplay from other tokens
      Object.keys(localSettings.tokens).forEach(id => {
        if (parseInt(id) !== newDefaultId) {
          localSettings.tokens[id].isDefaultDisplay = false;
        }
      });
    } else {
      console.error('❌ No valid tokens found to set as default!');
      localSettings.defaultTokenId = 0; // Fallback
    }
  } else {
    console.log(`✅ Current defaultTokenId (${currentDefaultId}) is valid`);
  }

  // 4. Update lastUpdated
  localSettings.lastUpdated = new Date().toISOString();

  // 5. Save updated local-settings.json
  saveJSON(LOCAL_SETTINGS_PATH, localSettings);

  // 6. Update default-token.json cache
  const defaultTokenCache = {
    tokenId: localSettings.defaultTokenId,
    lastUpdated: new Date().toISOString()
  };
  saveJSON(DEFAULT_TOKEN_PATH, defaultTokenCache);

  // 7. Update admin-config.json if exists
  if (adminConfig && adminConfig.tokens) {
    let updated = false;
    adminConfig.tokens.forEach(token => {
      if (token.local) {
        const tokenId = token.thirdweb?.tokenId;
        if (tokenId === localSettings.defaultTokenId) {
          token.local.isDefaultDisplay = true;
          updated = true;
        } else {
          token.local.isDefaultDisplay = false;
        }
      }
    });
    
    if (updated) {
      saveJSON(ADMIN_CONFIG_PATH, adminConfig);
    }
  }

  console.log('\n✨ Token integrity fix completed!');
  console.log(`\nFinal state:`);
  console.log(`- defaultTokenId: ${localSettings.defaultTokenId}`);
  console.log(`- Tokens: ${Object.keys(localSettings.tokens).map(id => 
    `${id}${localSettings.tokens[id].isDefaultDisplay ? ' (default)' : ''}`
  ).join(', ')}`);
}

// Run the fix
fixTokenIntegrity();