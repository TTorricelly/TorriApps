#!/usr/bin/env node

/**
 * Script to help refactor navigation in components
 * Finds and reports all hardcoded navigation patterns
 * 
 * Usage: node scripts/refactor-navigation.js [web-admin|app-client]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PROJECT = process.argv[2] || 'web-admin';
const PROJECT_PATHS = {
  'web-admin': 'Web-admin/Src',
  'app-client': 'App-client/src'
};

const BASE_PATH = path.join(__dirname, '..', PROJECT_PATHS[PROJECT]);

// Patterns to find
const NAVIGATION_PATTERNS = [
  /navigate\(`\/\$\{tenantSlug\}([^`]+)`\)/g,
  /navigate\(['"]\/\$\{tenantSlug\}([^'"]+)['"]\)/g,
  /to=\{`\/\$\{tenantSlug\}([^`]+)`\}/g,
  /href=\{`\/\$\{tenantSlug\}([^`]+)`\}/g,
  /window\.location\.href\s*=\s*`\/\$\{tenantSlug\}([^`]+)`/g,
];

// Route mapping for automatic conversion
const ROUTE_MAPPINGS = {
  '/dashboard': 'ROUTES.DASHBOARD',
  '/login': 'ROUTES.LOGIN',
  '/services': 'ROUTES.SERVICES',
  '/appointments': 'ROUTES.APPOINTMENTS',
  '/profile': 'ROUTES.PROFILE',
  '/professional/dashboard': 'ROUTES.PROFESSIONAL.DASHBOARD',
  '/professional/clients': 'ROUTES.PROFESSIONAL.CLIENTS',
  '/professional/agenda': 'ROUTES.PROFESSIONAL.AGENDA',
  // Add more mappings as needed
};

function findNavigationPatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];
  
  NAVIGATION_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const route = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      findings.push({
        file: filePath,
        line: lineNumber,
        match: match[0],
        route: route,
        suggestion: getSuggestion(route)
      });
    }
  });
  
  return findings;
}

function getSuggestion(route) {
  // Check if it's a simple route
  if (ROUTE_MAPPINGS[route]) {
    return `navigate(${ROUTE_MAPPINGS[route]})`;
  }
  
  // Check if it's a dynamic route
  if (route.includes('${')) {
    // Extract the pattern
    const baseRoute = route.split('/').filter(p => !p.includes('$')).join('/');
    const params = route.match(/\$\{([^}]+)\}/g);
    
    // Try to match known patterns
    if (route.startsWith('/clients/edit/')) {
      return `navigate(ROUTES.ADMIN.CLIENTS.EDIT(${params[0].slice(2, -1)}))`;
    }
    if (route.startsWith('/services/edit/')) {
      return `navigate(ROUTES.ADMIN.SERVICES.EDIT(${params[0].slice(2, -1)}))`;
    }
    // Add more patterns as needed
  }
  
  return `navigate(buildRoute('${route}'))`;
}

function generateRefactorReport() {
  const files = glob.sync(`${BASE_PATH}/**/*.{js,jsx}`, {
    ignore: ['**/node_modules/**', '**/build/**', '**/dist/**']
  });
  
  const allFindings = [];
  
  files.forEach(file => {
    const findings = findNavigationPatterns(file);
    if (findings.length > 0) {
      allFindings.push(...findings);
    }
  });
  
  // Group by file
  const groupedFindings = allFindings.reduce((acc, finding) => {
    const relPath = path.relative(BASE_PATH, finding.file);
    if (!acc[relPath]) {
      acc[relPath] = [];
    }
    acc[relPath].push(finding);
    return acc;
  }, {});
  
  return groupedFindings;
}

function generateImportStatement(hasRoutes, hasDynamicRoutes) {
  const imports = ["import { useNavigation } from '../shared/hooks/useNavigation';"];
  
  if (hasRoutes) {
    imports.push("import { ROUTES } from '../shared/navigation';");
  }
  
  return imports.join('\n');
}

function printReport(findings) {
  console.log(`\n🔍 Navigation Refactor Report for ${PROJECT.toUpperCase()}\n`);
  console.log(`Found ${Object.keys(findings).length} files with hardcoded navigation:\n`);
  
  Object.entries(findings).forEach(([file, items]) => {
    console.log(`\n📄 ${file} (${items.length} occurrences)`);
    
    items.forEach(item => {
      console.log(`  Line ${item.line}: ${item.match}`);
      console.log(`  ✅ Suggestion: ${item.suggestion}`);
    });
    
    // Check what imports are needed
    const hasRoutes = items.some(i => i.suggestion.includes('ROUTES.'));
    const hasDynamicRoutes = items.some(i => i.suggestion.includes('buildRoute'));
    
    console.log(`\n  📦 Add imports:`);
    console.log(`  ${generateImportStatement(hasRoutes, hasDynamicRoutes)}`);
  });
  
  // Summary
  const totalOccurrences = Object.values(findings).reduce((sum, items) => sum + items.length, 0);
  console.log(`\n📊 Summary:`);
  console.log(`  - Total files: ${Object.keys(findings).length}`);
  console.log(`  - Total occurrences: ${totalOccurrences}`);
  console.log(`  - Estimated time: ${Math.ceil(totalOccurrences * 2)} minutes\n`);
}

// Generate and save detailed report
function saveDetailedReport(findings) {
  const reportPath = path.join(__dirname, `../${PROJECT}-navigation-refactor-report.json`);
  
  const report = {
    project: PROJECT,
    timestamp: new Date().toISOString(),
    summary: {
      filesCount: Object.keys(findings).length,
      totalOccurrences: Object.values(findings).reduce((sum, items) => sum + items.length, 0)
    },
    findings: findings
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Detailed report saved to: ${reportPath}\n`);
}

// Main execution
console.log('🚀 Starting navigation pattern analysis...\n');
const findings = generateRefactorReport();

if (Object.keys(findings).length === 0) {
  console.log('✨ No hardcoded navigation patterns found! Your code is clean.\n');
} else {
  printReport(findings);
  saveDetailedReport(findings);
  
  console.log('💡 Next steps:');
  console.log('  1. Add shared navigation components to your project');
  console.log('  2. Update files starting with high-priority ones');
  console.log('  3. Test each component after refactoring');
  console.log('  4. Remove old navigation utilities\n');
}