const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const rootDir = __dirname;

// Exclude these files or directories from scanning
const excludePaths = [
  'node_modules/',
  '404.html',
  // add more paths or files to exclude here
];

// Helper: Recursively get all HTML files except excluded paths
function scanHtmlFilesRecursive(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Check excludes
    const isExcluded = excludePaths.some((pattern) => {
      if (pattern.endsWith('/')) {
        return relPath.startsWith(pattern);
      } else {
        return relPath === pattern;
      }
    });
    if (isExcluded) continue;

    if (stat.isDirectory()) {
      files = files.concat(scanHtmlFilesRecursive(fullPath, baseDir));
    } else if (file.endsWith('.html')) {
      files.push(relPath);
    }
  }
  return files;
}

// Check if a link exists as a file
function linkExists(linkPath) {
  // Remove URL params or anchors, handle relative paths
  const cleanPath = linkPath.split(/[?#]/)[0];
  const fullPath = path.join(rootDir, cleanPath);
  return fs.existsSync(fullPath);
}

// Main function to scan pages for broken links
function checkLinks() {
  const htmlFiles = scanHtmlFilesRecursive(rootDir);
  let brokenLinks = [];
  let orphanPages = new Set(htmlFiles);

  htmlFiles.forEach((page) => {
    const fullPagePath = path.join(rootDir, page);
    const content = fs.readFileSync(fullPagePath, 'utf-8');
    const $ = cheerio.load(content);

    // Scan all <a href=""> links
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');

      // Skip external links (starting with http, https, mailto, tel)
      if (/^(http|https|mailto|tel):/.test(href)) return;

      // Normalize relative links (remove leading ./ or /)
      let normalizedHref = href.replace(/^\.\//, '');

      // If it's a fragment only (#something), skip
      if (normalizedHref.startsWith('#') || normalizedHref === '') return;

      // Check if linked file exists relative to rootDir
      if (!linkExists(normalizedHref)) {
        brokenLinks.push({
          page,
          brokenLink: href,
        });
      } else {
        // Link exists, so the target page is linked — remove it from orphan set
        // Also handle fragment links (like race.html#section)
        const linkNoFragment = normalizedHref.split('#')[0];
        orphanPages.delete(linkNoFragment);
      }
    });
  });

  // Filter orphan pages: pages not linked from anywhere
  // Exclude index.html as it’s usually the root
  orphanPages.delete('index.html');

  // Report results
  console.log('\nLink Audit Report\n=================');
  console.log(`Total HTML files scanned: ${htmlFiles.length}`);
  console.log(`Total broken links found: ${brokenLinks.length}`);
  brokenLinks.forEach(({ page, brokenLink }) => {
    console.log(`⚠️ Broken link in "${page}" → "${brokenLink}" does not exist`);
  });

  if (orphanPages.size > 0) {
    console.log('\nOrphan pages found: ' + orphanPages.size);
    orphanPages.forEach((p) => console.log(`❌ Orphan page: "${p}" is not linked from anywhere`));
  } else {
    console.log('\nNo orphan pages found.');
  }

  if (brokenLinks.length > 0) {
    console.log('\n❌ Commit aborted: Please fix broken links before committing.');
    process.exit(1);
  } else {
    console.log('\n✅ No broken links detected.');
  }
}

checkLinks();
