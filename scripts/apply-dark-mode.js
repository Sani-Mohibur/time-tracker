const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '../src/renderer/pages'),
  path.join(__dirname, '../src/renderer/components')
];

const replacements = [
  { regex: /(?<!dark:)bg-white/g, replacement: 'bg-white dark:bg-slate-800' },
  { regex: /(?<!dark:)text-slate-900/g, replacement: 'text-slate-900 dark:text-slate-50' },
  { regex: /(?<!dark:)text-slate-800/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { regex: /(?<!dark:)text-slate-700/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { regex: /(?<!dark:)text-slate-600/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { regex: /(?<!dark:)text-slate-500/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)bg-slate-50/g, replacement: 'bg-slate-50 dark:bg-slate-800/50' },
  { regex: /(?<!dark:)bg-slate-100/g, replacement: 'bg-slate-100 dark:bg-slate-700' },
  { regex: /(?<!dark:)border-slate-200/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /(?<!dark:)border-slate-100/g, replacement: 'border-slate-100 dark:border-slate-700/50' },
  { regex: /(?<!dark:)divide-slate-200/g, replacement: 'divide-slate-200 dark:divide-slate-700' },
  { regex: /(?<!dark:)divide-slate-100/g, replacement: 'divide-slate-100 dark:divide-slate-700/50' },
  { regex: /(?<!dark:)hover:bg-slate-50/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-700/50' },
  { regex: /(?<!dark:)hover:bg-slate-100/g, replacement: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
  { regex: /(?<!dark:)ring-slate-200/g, replacement: 'ring-slate-200 dark:ring-slate-700' },
  { regex: /(?<!dark:)ring-slate-100/g, replacement: 'ring-slate-100 dark:ring-slate-800' }
];

function processFile(filePath) {
  if (filePath.endsWith('Navbar.tsx')) return; // skip
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

for (const dir of dirs) {
  walkDir(dir);
}
console.log('Done');
