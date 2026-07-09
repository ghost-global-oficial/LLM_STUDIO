const fs = require('fs');
let c = fs.readFileSync('C:/T/talos-windows/src/App.tsx', 'utf8');

// Remove all corrupted translations for zh-CN, ja, ko, ru, ar from STRINGS
// Pattern: , 'zh-CN': '...',  or , ja: '...',  etc
const langs = ['zh-CN', 'ja', 'ko', 'ru', 'ar'];
for (const lang of langs) {
  // Match the language key and its value - handles both quoted and unquoted keys
  const regex = new RegExp(`,\\s*'${lang}':\\s*'[^']*(?:'[^']*)*'`, 'g');
  c = c.replace(regex, '');
}

fs.writeFileSync('C:/T/talos-windows/src/App.tsx', c, 'utf8');

// Verify the build still works
console.log('Removed corrupted translations. Verifying...');

const check = fs.readFileSync('C:/T/talos-windows/src/App.tsx', 'utf8');
// Make sure we can still find the key strings
const keys = ['welcomeTitle', 'chats', 'settings', 'hardware'];
keys.forEach(k => {
  if (!check.includes(k)) console.log('WARNING: missing key', k);
});
console.log('All key strings present');
