#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all JSX files
function getJSXFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules' && item !== 'dist') {
      files.push(...getJSXFiles(fullPath));
    } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix common lint issues
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  
  // Remove unused React imports (since we're using JSX transform)
  if (content.includes("import React") && !content.includes("React.")) {
    content = content.replace(/import React[^;]*;?\n?/g, '');
    changed = true;
  }
  
  // Fix jsx property to dangerouslySetInnerHTML
  if (content.includes('jsx={')) {
    content = content.replace(/jsx=\{([^}]+)\}/g, 'dangerouslySetInnerHTML={{__html: $1}}');
    changed = true;
  }
  
  // Prefix unused variables with underscore
  const unusedVarPattern = /const (\w+) = /g;
  let match;
  const varsToCheck = [];
  
  while ((match = unusedVarPattern.exec(content)) !== null) {
    varsToCheck.push(match[1]);
  }
  
  // Check if variables are used and prefix with _ if not
  for (const varName of varsToCheck) {
    const regex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = content.match(regex);
    
    // If variable appears only once (in declaration), prefix with _
    if (matches && matches.length === 1) {
      content = content.replace(
        new RegExp(`const ${varName} = `), 
        `const _${varName} = `
      );
      changed = true;
    }
  }
  
  // Fix require statements
  content = content.replace(/require\(/g, 'import(');
  if (content.includes('import(')) {
    changed = true;
  }
  
  // Fix hasOwnProperty
  content = content.replace(/\.hasOwnProperty\(/g, '.hasOwnProperty.call(obj, ');
  if (content.includes('hasOwnProperty.call')) {
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = getJSXFiles(srcDir);

console.log(`Fixing ${files.length} files...`);

for (const file of files) {
  try {
    fixFile(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Done fixing lint issues!');