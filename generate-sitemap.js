const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const baseUrl = 'https://project-callisto.vercel.app/';
const rootDir = __dirname;
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const gzipPath = path.join(rootDir, 'sitemap.xml.gz');
const logPath = path.join(rootDir, 'sitemap-log.txt');

const pageConfig = {
  'index.html': { priority: '1.0', changefreq: 'monthly' },
  'pages/about.html': { priority: '0.9', changefreq: 'monthly' },
  'pages/race.html': { priority: '0.9', changefreq: 'monthly' },
  'pages/contact.html': { priority: '0.5', changefreq: 'yearly' },
  'pages/legal.html': { priority: '0.4', changefreq: 'yearly' },
  'pages/license.html': { priority: '0.4', changefreq: 'yearly' },
};

const excludePaths = ['404.html', 'temp/', 'build/'];

function scanHtmlFilesRecursive(dir, baseDir = dir, exclude = []) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    const isExcluded = exclude.some((pattern) => {
      if (pattern.endsWith('/')) return relPath.startsWith(pattern);
      return relPath === pattern;
    });

    if (isExcluded) continue;

    if (stat.isDirectory()) {
      files = files.concat(scanHtmlFilesRecursive(fullPath, baseDir, exclude));
    } else if (file.endsWith('.html')) {
      files.push(relPath);
    }
  }
  return files;
}

async function generateSitemap() {
  const htmlFiles = scanHtmlFilesRecursive(rootDir, rootDir, excludePaths);
  let manuallyConfiguredCount = 0;
  let defaultedPages = [];
  const logLines = [];

  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const file of htmlFiles) {
    const urlPath = file === 'index.html' ? '' : file;
    const loc = baseUrl + urlPath;

    let lastMod;
    try {
      const stats = await fs.promises.stat(path.join(rootDir, file));
      lastMod = stats.mtime.toISOString();
    } catch (err) {
      console.error(`Error getting stats for ${file}:`, err.message);
      lastMod = new Date().toISOString();
    }

    const config = pageConfig[file];
    const priority = config?.priority || '0.7';
    const changefreq = config?.changefreq || 'monthly';

    sitemapContent += `
    <url>
      <loc>${loc}</loc>
      <lastmod>${lastMod}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority}</priority>
    </url>`;

    if (config) {
      manuallyConfiguredCount++;
      logLines.push(`✅ ${file} → priority: ${priority}, changefreq: ${changefreq}`);
    } else {
      defaultedPages.push(file);
      logLines.push(`⚠️  ${file} → using default priority (0.7) and changefreq (monthly)`);
    }
  }

  sitemapContent += `\n</urlset>`;

  try {
    await fs.promises.writeFile(sitemapPath, sitemapContent.trim());
    console.log('✅ sitemap.xml written.');
  } catch (err) {
    console.error('❌ Failed to write sitemap.xml:', err.message);
  }

  try {
    const rawXml = await fs.promises.readFile(sitemapPath);
    const compressed = zlib.gzipSync(rawXml);
    await fs.promises.writeFile(gzipPath, compressed);
    console.log('📦 sitemap.xml.gz compressed.');
  } catch (err) {
    console.error('❌ Failed to compress sitemap.xml.gz:', err.message);
  }

  const summary = `
Sitemap generation summary
--------------------------
Total pages: ${htmlFiles.length}
Manually configured: ${manuallyConfiguredCount}
Defaulted: ${defaultedPages.length}

Unlisted/defaulted pages:
${defaultedPages.map((p) => ` - ${p}`).join('\n')}
`;

  try {
    await fs.promises.writeFile(logPath, `${logLines.join('\n')}\n${summary.trim()}`);
    console.log('📝 sitemap-log.txt created.');
  } catch (err) {
    console.error('❌ Failed to write sitemap-log.txt:', err.message);
  }
}

generateSitemap().catch((err) => {
  console.error('An unhandled error occurred during sitemap generation:', err);
});
