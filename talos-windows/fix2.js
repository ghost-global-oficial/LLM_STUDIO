const fs = require('fs');
let c = fs.readFileSync('C:/T/talos-windows/src/App.tsx', 'utf8');

// The corruption pattern is UTF-8 bytes double-encoded as Latin-1
// 'ê' (0xC3AA) -> read as Latin-1 -> 'Ãª' (0xC3 0xAA)
// Then 'Ãª' encoded to UTF-8 -> '\u00C3\u0083\u00C2\u00AA'
// But in the file it shows as the string "Ãª" etc.

// Strategy: replace known corrupted patterns with correct characters
const map = {
  'ÃƒÂª': 'ê', 'ÃƒÂ©': 'é', 'ÃƒÂ§': 'ç', 'ÃƒÂ³': 'ó', 'ÃƒÂ¡': 'á',
  'ÃƒÂ­': 'í', 'ÃƒÂµ': 'õ', 'ÃƒÂ£': 'ã', 'ÃƒÂº': 'ú', 'ÃƒÂ€': 'À',
  'ÃÃ': 'Ã',  // triple encoding
  'ÃƒÂ¶': 'ö', 'ÃƒÂ¼': 'ü', 'ÃƒÂ¥': 'å',
  'Ã©â€œ': '"', 'Ã¢Å"': '✓', 'Ã¢â€¢': '•',
  'Ã§Ã³': 'ço', 'Ã§Ãµ': 'çõ', 'Ã§Ã£': 'ça',
  'Ã£Â¡': 'á', 'Ã£Â©': 'é', 'Ã£Âª': 'ê',
  'Ã©Âª': 'え', 'Ã©ÂªÂ¼': 'よう',
  'Ã¦â€”Â¥': '日', 'Ã¦Â³Âµ': '本', 'Ã¨ÂªÂ¾': 'ようこそ',
  'Ã¬â€¢ÂµÃªÂµÂ§Ã¬â€“Â´': '한국어',
  'ÃÃ Ã Ã Ã Ã Ã': 'Русский',
  'Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â±Ã˜Â¨Ã™Â Ã˜Â©': 'العربية',
};

let count = 0;
for (const [bad, good] of Object.entries(map)) {
  while (c.includes(bad)) { c = c.replace(bad, good); count++; }
}

// More aggressive: replace any remaining two-byte patterns
// Pattern: char 0xC3 followed by various chars
c = c.replace(/ÃƒÂ§/g, 'ç');
c = c.replace(/ÃƒÂª/g, 'ê');
c = c.replace(/ÃƒÂ©/g, 'é');
c = c.replace(/ÃƒÂ³/g, 'ó');
c = c.replace(/ÃƒÂ¡/g, 'á');
c = c.replace(/ÃƒÂ­/g, 'í');
c = c.replace(/ÃƒÂµ/g, 'õ');
c = c.replace(/ÃƒÂ£/g, 'ã');
c = c.replace(/ÃƒÂº/g, 'ú');
c = c.replace(/ÃƒÂ¨/g, 'è');
c = c.replace(/ÃƒÂ¶/g, 'ö');
c = c.replace(/ÃƒÂ¼/g, 'ü');

fs.writeFileSync('C:/T/talos-windows/src/App.tsx', c, 'utf8');
console.log('Fixed', count, 'patterns');

// Verify
const check = c.match(/Ãƒ|Ã®|Ã©|Ã¡|Ã§|Ã³|Ã­|Ãµ|Ã£|Ãº/g);
console.log(check ? 'Still has ' + check.length + ' issues' : 'All clean');
