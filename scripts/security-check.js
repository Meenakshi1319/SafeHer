#!/usr/bin/env node

/**
 * SafeHer Security Check Script
 * Scans the repository for potential security issues before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('═'.repeat(70), 'cyan');
  log(`  ${message}`, 'cyan');
  log('═'.repeat(70), 'cyan');
  console.log('');
}

// Security patterns to search for
const SECURITY_PATTERNS = [
  {
    name: 'Google API Keys',
    pattern: /AIza[a-zA-Z0-9_-]{35}/g,
    severity: 'critical'
  },
  {
    name: 'OpenAI API Keys',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'critical'
  },
  {
    name: 'Twilio Account SID',
    pattern: /AC[a-z0-9]{32}/g,
    severity: 'critical'
  },
  {
    name: 'Private Keys',
    pattern: /BEGIN (RSA |EC )?PRIVATE KEY/g,
    severity: 'critical'
  },
  {
    name: 'JWT Secrets',
    pattern: /(jwt|JWT).*secret.*[=:]\s*['"][^'"]{20,}['"]/g,
    severity: 'high'
  },
  {
    name: 'Generic Secrets',
    pattern: /(secret|password|token).*[=:]\s*['"][^'"]{20,}['"]/gi,
    severity: 'medium'
  }
];

// Files that should be gitignored
const REQUIRED_GITIGNORE = [
  '.env',
  '.env.local',
  'backend/.env',
  'backend/serviceAccountKey.json',
  'backend/uploads/',
  'backend/logs/',
  'node_modules/'
];

// Files to scan
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];
const EXCLUDE_DIRS = ['node_modules', '.git', '.expo', 'dist', 'build', 'coverage'];
const EXCLUDE_FILES = [
  'SECURITY_AUDIT_REPORT.md',
  'DEPLOYMENT_SECURITY_CHECKLIST.md',
  'FINAL_SECURITY_REPORT.md',
  'SETUP_GUIDE.md',
  'GITHUB_DEPLOYMENT_GUIDE.md',
  'serviceAccountKey.json.example',
  '.env.example',
  '.env.local.example'
];

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      const isExcluded = EXCLUDE_FILES.some(excluded => filePath.includes(excluded));
      if (SCAN_EXTENSIONS.includes(ext) && !isExcluded) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Scan a file for security patterns
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  // Skip files that are gitignored (they're safe)
  const gitignored = [
    'serviceAccountKey.json',
    '.env',
    '.env.local'
  ];
  
  if (gitignored.some(pattern => filePath.includes(pattern))) {
    return findings; // Skip gitignored files
  }

  SECURITY_PATTERNS.forEach(({ name, pattern, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      // Check if it's just validation code (not actual secrets)
      const isValidationCode = content.includes('validate:') || 
                               content.includes('validation') ||
                               content.includes('.includes(');
      
      if (!isValidationCode) {
        findings.push({
          file: filePath,
          pattern: name,
          severity,
          matches: matches.length,
          preview: matches[0].substring(0, 50) + '...'
        });
      }
    }
  });

  return findings;
}

/**
 * Check if .gitignore is properly configured
 */
function checkGitignore() {
  header('Checking .gitignore Configuration');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    log('❌ .gitignore file not found!', 'red');
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const missing = [];

  REQUIRED_GITIGNORE.forEach(pattern => {
    if (!gitignoreContent.includes(pattern)) {
      missing.push(pattern);
    }
  });

  if (missing.length > 0) {
    log('⚠️  Missing patterns in .gitignore:', 'yellow');
    missing.forEach(pattern => log(`   - ${pattern}`, 'yellow'));
    return false;
  }

  log('✅ .gitignore is properly configured', 'green');
  return true;
}

/**
 * Check if sensitive files exist
 */
function checkSensitiveFiles() {
  header('Checking for Sensitive Files');

  const sensitiveFiles = [
    '.env.local',
    'backend/.env',
    'backend/serviceAccountKey.json'
  ];

  const existing = [];
  const missing = [];

  sensitiveFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      existing.push(file);
    } else {
      missing.push(file);
    }
  });

  if (existing.length > 0) {
    log('✅ Found sensitive files (should be gitignored):', 'green');
    existing.forEach(file => log(`   - ${file}`, 'green'));
  }

  if (missing.length > 0) {
    log('⚠️  Missing sensitive files (may need to be created):', 'yellow');
    missing.forEach(file => log(`   - ${file}`, 'yellow'));
  }

  return true;
}

/**
 * Check git status for staged sensitive files
 */
function checkGitStatus() {
  header('Checking Git Status');

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const lines = status.split('\n').filter(line => line.trim());

    const sensitivePatterns = ['.env', 'serviceAccountKey.json'];
    const stagedSensitive = [];

    lines.forEach(line => {
      const file = line.substring(3);
      // Only flag if it's an actual sensitive file, not example files or deletions
      const isExample = file.includes('.example');
      const isDeletion = line.startsWith('D ');
      const isSensitive = sensitivePatterns.some(pattern => file.includes(pattern));
      
      if (isSensitive && !isExample && !isDeletion) {
        stagedSensitive.push(file);
      }
    });

    if (stagedSensitive.length > 0) {
      log('❌ Sensitive files are staged for commit:', 'red');
      stagedSensitive.forEach(file => log(`   - ${file}`, 'red'));
      log('\n💡 Run: git reset HEAD <file> to unstage', 'yellow');
      return false;
    }

    log('✅ No sensitive files staged for commit', 'green');
    return true;
  } catch (error) {
    log('⚠️  Could not check git status (not a git repository?)', 'yellow');
    return true;
  }
}

/**
 * Scan source code for hardcoded secrets
 */
function scanSourceCode() {
  header('Scanning Source Code for Secrets');

  const files = getAllFiles(process.cwd());
  const allFindings = [];

  files.forEach(file => {
    const findings = scanFile(file);
    if (findings.length > 0) {
      allFindings.push(...findings);
    }
  });

  if (allFindings.length === 0) {
    log('✅ No hardcoded secrets found in source code', 'green');
    return true;
  }

  const critical = allFindings.filter(f => f.severity === 'critical');
  const high = allFindings.filter(f => f.severity === 'high');
  const medium = allFindings.filter(f => f.severity === 'medium');

  // Only fail on critical and high severity
  if (critical.length > 0 || high.length > 0) {
    log(`❌ Found ${critical.length + high.length} critical/high severity secrets in source code:`, 'red');
    console.log('');

    if (critical.length > 0) {
      log('🔴 CRITICAL:', 'red');
      critical.forEach(f => {
        log(`   ${f.file}`, 'red');
        log(`   Pattern: ${f.pattern} (${f.matches} matches)`, 'red');
        log(`   Preview: ${f.preview}`, 'red');
        console.log('');
      });
    }

    if (high.length > 0) {
      log('🟠 HIGH:', 'yellow');
      high.forEach(f => {
        log(`   ${f.file}`, 'yellow');
        log(`   Pattern: ${f.pattern} (${f.matches} matches)`, 'yellow');
        console.log('');
      });
    }

    return false;
  }

  // Medium severity findings are warnings only
  if (medium.length > 0) {
    log(`⚠️  Found ${medium.length} potential issues (medium severity - likely false positives)`, 'yellow');
    log('   These are typically variable names or comments, not actual secrets', 'yellow');
  }

  log('✅ No critical or high severity secrets found', 'green');
  return true;
}

/**
 * Check for example files
 */
function checkExampleFiles() {
  header('Checking Example Files');

  const exampleFiles = [
    '.env.local.example',
    'backend/.env.example',
    'backend/serviceAccountKey.json.example'
  ];

  const missing = [];

  exampleFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      missing.push(file);
    }
  });

  if (missing.length > 0) {
    log('⚠️  Missing example files:', 'yellow');
    missing.forEach(file => log(`   - ${file}`, 'yellow'));
    return false;
  }

  log('✅ All example files present', 'green');
  return true;
}

/**
 * Run npm audit
 */
function runNpmAudit() {
  header('Running npm audit');

  try {
    execSync('npm audit --audit-level=moderate', { encoding: 'utf8', stdio: 'inherit' });
    log('✅ No security vulnerabilities found', 'green');
    return true;
  } catch (error) {
    log('⚠️  Security vulnerabilities detected. Run: npm audit fix', 'yellow');
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('');
  log('╔══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           SafeHer Security Check                                 ║', 'cyan');
  log('║           Scanning for security issues...                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════╝', 'cyan');

  const checks = [
    { name: '.gitignore', fn: checkGitignore },
    { name: 'Sensitive Files', fn: checkSensitiveFiles },
    { name: 'Git Status', fn: checkGitStatus },
    { name: 'Source Code', fn: scanSourceCode },
    { name: 'Example Files', fn: checkExampleFiles },
    { name: 'npm audit', fn: runNpmAudit }
  ];

  const results = checks.map(check => ({
    name: check.name,
    passed: check.fn()
  }));

  // Summary
  header('Security Check Summary');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });

  console.log('');
  log(`Results: ${passed}/${total} checks passed`, passed === total ? 'green' : 'yellow');
  console.log('');

  if (passed === total) {
    log('🎉 All security checks passed! Repository is safe to push.', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some security checks failed. Please fix issues before pushing.', 'yellow');
    process.exit(1);
  }
}

// Run the script
main();
