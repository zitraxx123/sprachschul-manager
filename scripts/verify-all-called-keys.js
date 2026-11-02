const fs = require('fs');
const path = require('path');

const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'de.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'en.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'ru.json'), 'utf8'));

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

let totalChecked = 0;
let missingKeys = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Match namespace hooks: useTranslations("namespace") or getTranslations("namespace")
  // Or multiple hooks in one file
  const hookMatches = [...content.matchAll(/(?:useTranslations|getTranslations)\(\s*["']([^"']+)["']\s*\)/g)];

  // Also check direct key usages like t("key") or tCommon("key")
  // Let's find patterns like: const t = useTranslations("xyz"); or const tXyz = useTranslations("xyz");
  const varMap = {};
  const varAssignRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = varAssignRegex.exec(content)) !== null) {
    varMap[match[1]] = match[2];
  }

  for (const [varName, namespace] of Object.entries(varMap)) {
    // Find calls like varName("key") or varName('key', ...)
    const callRegex = new RegExp(`\\b${varName}\\(\\s*["']([a-zA-Z0-9_.]+)["']`, 'g');
    let callMatch;
    while ((callMatch = callRegex.exec(content)) !== null) {
      const key = callMatch[1];
      totalChecked++;

      // Check in de, en, ru
      ['de', 'en', 'ru'].forEach(lang => {
        const dict = lang === 'de' ? de : lang === 'en' ? en : ru;
        const nsObj = dict[namespace];
        if (!nsObj) {
          missingKeys.push({ file: path.relative(path.join(__dirname, '..'), file), lang, namespace, key, reason: `Namespace '${namespace}' not found` });
          return;
        }

        // Key might have dots if nested, but in our dictionaries it's usually flat under namespace
        const val = nsObj[key];
        if (val === undefined) {
          missingKeys.push({ file: path.relative(path.join(__dirname, '..'), file), lang, namespace, key, reason: `Key '${key}' not found in namespace '${namespace}'` });
        }
      });
    }
  }
});

console.log(`Total t(...) calls verified: ${totalChecked}`);
if (missingKeys.length === 0) {
  console.log('✓ PERFECT: All translation calls in source code resolve to existing keys in de, en, and ru!');
} else {
  console.log(`✗ Found ${missingKeys.length} unresolved keys:`);
  missingKeys.forEach(m => console.log(`  - [${m.lang}] ${m.file}: ${m.namespace}.${m.key} (${m.reason})`));
}
