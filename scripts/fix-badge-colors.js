import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if --fix flag is provided
const shouldFix = process.argv.includes('--fix');

// Extract badge info from README file
function extractBadgeInfo(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const badgeRegex =
    /\[!\[.*?\]\(https:\/\/img\.shields\.io\/badge\/(.*?)-([0-9A-Fa-f]{6})\?.*?logo=([a-z0-9-]+)/gi;

  const badges = {};
  let match;
  while ((match = badgeRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const label = match[1];
    const color = match[2];
    const logo = match[3];
    // Normalize logo name (lowercase and remove dashes for Simple Icons lookup)
    const normalizedLogo = logo.toLowerCase().replace(/-/g, '');

    if (!badges[normalizedLogo]) {
      badges[normalizedLogo] = {
        color: color,
        logo: logo,
        label: label,
        fullMatch: fullMatch
      };
    }
  }

  return badges;
}

// Fix badge colors in README file
function fixBadgeColors(filePath, colorChanges) {
  let content = readFileSync(filePath, 'utf8');
  let changeCount = 0;

  for (const [logo, change] of Object.entries(colorChanges)) {
    const oldColor = change.current.toUpperCase();
    const newColor = change.official.toUpperCase();

    // Create regex to match badges with this logo and old color
    const badgeRegex = new RegExp(
      `(\\[!\\[.*?\\]\\(https:\\/\\/img\\.shields\\.io\\/badge\\/.*?-)${oldColor}(\\?.*?logo=${change.logoName})`,
      'gi'
    );

    const newContent = content.replace(badgeRegex, `$1${newColor}$2`);

    if (newContent !== content) {
      changeCount++;
      content = newContent;
      console.log(`  ✅ Fixed ${logo}: ${oldColor} → ${newColor}`);
    }
  }

  if (changeCount > 0) {
    writeFileSync(filePath, content, 'utf8');
    return changeCount;
  }

  return 0;
}

async function fetchSimpleIcons() {
  const response = await fetch(
    'https://raw.githubusercontent.com/simple-icons/simple-icons/refs/heads/develop/data/simple-icons.json'
  );
  const icons = await response.json();

  // Create a map of slug -> hex color
  const iconMap = {};
  icons.forEach(icon => {
    // Use slug if available, otherwise generate from title
    const slug = icon.slug || icon.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    iconMap[slug] = icon.hex;
  });

  return iconMap;
}

async function main() {
  console.log('Fetching Simple Icons data...\n');
  const simpleIcons = await fetchSimpleIcons();

  // Get badge info from README files (one level up from scripts directory)
  const readmePath = join(__dirname, '..', 'README.md');
  const readmeEnPath = join(__dirname, '..', 'README.en.md');
  const currentBadges = extractBadgeInfo(readmePath);

  console.log('Verifying badge colors:\n');
  console.log('='.repeat(80));
  console.log(
    'Logo Name'.padEnd(25) + 'Current Color'.padEnd(20) + 'Official Color'.padEnd(20) + 'Status'
  );
  console.log('='.repeat(80));

  let totalChecked = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  const issues = {};

  for (const [logo, badgeInfo] of Object.entries(currentBadges)) {
    totalChecked++;
    const currentColor = badgeInfo.color;
    const officialColor = simpleIcons[logo];

    if (!officialColor) {
      console.log(
        `${logo.padEnd(25)}${currentColor.padEnd(20)}${'NOT FOUND'.padEnd(20)}⚠️  Missing`
      );
      continue;
    }

    const currentUpper = currentColor.toUpperCase();
    const officialUpper = officialColor.toUpperCase();

    if (currentUpper === officialUpper) {
      console.log(
        `${logo.padEnd(25)}${currentColor.padEnd(20)}${officialColor.padEnd(20)}✅ Correct`
      );
      correctCount++;
    } else {
      console.log(
        `${logo.padEnd(25)}${currentColor.padEnd(20)}${officialColor.padEnd(20)}❌ Mismatch`
      );
      incorrectCount++;
      issues[logo] = {
        current: currentColor,
        official: officialColor,
        logoName: badgeInfo.logo
      };
    }
  }

  console.log('='.repeat(80));
  console.log(`\nSummary:`);
  console.log(`Total badges checked: ${totalChecked}`);
  console.log(`✅ Correct: ${correctCount}`);
  console.log(`❌ Incorrect: ${incorrectCount}`);

  if (Object.keys(issues).length > 0) {
    console.log('\n\n🔧 Badges that need updating:\n');
    console.log('='.repeat(80));
    Object.entries(issues).forEach(([logo, issue]) => {
      console.log(`${logo}:`);
      console.log(`  Current:  ${issue.current}`);
      console.log(`  Official: ${issue.official}`);
      console.log(`  Change:   ${issue.current} → ${issue.official}\n`);
    });

    if (shouldFix) {
      console.log('\n🔧 Applying fixes...\n');

      const fixedCount1 = fixBadgeColors(readmePath, issues);
      console.log(`\n✅ Fixed ${fixedCount1} badge(s) in README.md`);

      const fixedCount2 = fixBadgeColors(readmeEnPath, issues);
      console.log(`✅ Fixed ${fixedCount2} badge(s) in README.en.md`);

      console.log('\n🎉 All badge colors have been fixed!');
    } else {
      console.log('\n💡 Tip: Run with --fix flag to automatically fix all mismatches:');
      console.log('   node scripts/fix-badge-colors.js --fix\n');
    }
  } else {
    console.log('\n🎉 All badge colors are correct!');
  }
}

main().catch(console.error);
