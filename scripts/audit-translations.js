const fs = require('fs');
const path = require('path');

const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'de.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'en.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'ru.json'), 'utf8'));

console.log('=== STEP 1: DICTIONARY KEY PARITY CHECK ===');

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getAllKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const deKeys = new Set(getAllKeys(de));
const enKeys = new Set(getAllKeys(en));
const ruKeys = new Set(getAllKeys(ru));

console.log(`Total Keys -> DE: ${deKeys.size}, EN: ${enKeys.size}, RU: ${ruKeys.size}`);

let parityErrors = 0;
deKeys.forEach(k => {
  if (!enKeys.has(k)) {
    console.error(`MISSING IN EN: ${k}`);
    parityErrors++;
  }
  if (!ruKeys.has(k)) {
    console.error(`MISSING IN RU: ${k}`);
    parityErrors++;
  }
});

enKeys.forEach(k => {
  if (!deKeys.has(k)) {
    console.error(`MISSING IN DE: ${k}`);
    parityErrors++;
  }
});

ruKeys.forEach(k => {
  if (!deKeys.has(k)) {
    console.error(`MISSING IN DE: ${k}`);
    parityErrors++;
  }
});

if (parityErrors === 0) {
  console.log('✓ All 3 dictionaries have 100% identical keys!');
} else {
  console.log(`✗ Found ${parityErrors} dictionary parity mismatches.`);
}

console.log('\n=== STEP 2: CODEBASE TRANSLATION AUDIT ===');

function getFiles(dir, exts = ['.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = getFiles(path.join(__dirname, '..', 'src'));
console.log(`Auditing ${files.length} source files in src/...`);

// Search for residual hardcoded German action words in JSX
const germanPatterns = [
  />\s*Speichern\s*</,
  />\s*Abbrechen\s*</,
  />\s*Löschen\s*</,
  />\s*Bearbeiten\s*</,
  />\s*Schließen\s*</,
  />\s*Zurück\s*</,
  />\s*Hinzufügen\s*</,
  />\s*Anlegen\s*</,
  />\s*Anwesenheit\s*</,
  />\s*Abwesend\s*</,
  />\s*Entschuldigt\s*</,
  />\s*Anwesend\s*</,
];

let potentialLingering = 0;
files.forEach(file => {
  // Skip help-center-view for FAQ data content, or impressum/datenschutz
  if (file.includes('impressum') || file.includes('datenschutz') || file.includes('help-center-view.tsx')) {
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  germanPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.warn(`Potential hardcoded string in ${path.relative(path.join(__dirname, '..'), file)}: matches ${pattern}`);
      potentialLingering++;
    }
  });
});

if (potentialLingering === 0) {
  console.log('✓ No hardcoded German button/label patterns found in UI components!');
} else {
  console.log(`Notice: Found ${potentialLingering} potential lingering German patterns.`);
}
