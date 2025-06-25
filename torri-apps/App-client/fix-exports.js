#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const files = [
  'src/utils/textUtils.js',
  'src/utils/validators.js', 
  'src/utils/authTestUtils.js',
  'src/utils/formatters.js',
  'src/utils/themeUtils.js',
  'src/utils/urlHelpers.js',
  'src/utils/phoneUtils.js',
  'src/utils/apiHelpers.js',
  'src/utils/dateUtils.js',
  'src/utils/storageUtils.js',
  'src/services/userService.js',
  'src/services/categoryService.js',
  'src/services/professionalService.js',
  'src/services/appointmentService.js',
  'src/services/companyService.js'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Fix export const _ to export const
    content = content.replace(/export const _(\w+)/g, 'export const $1');
    
    fs.writeFileSync(file, content);
    console.log(`Fixed exports in: ${file}`);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Done fixing exports!');