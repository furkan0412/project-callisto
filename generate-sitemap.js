const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');

const baseUrl = 'https://project-callisto.vercel.app/';
const rootDir = __dirname;
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const gzipPath = path.join(rootDir, 'sitemap.xml.gz');
const logPath = path.join(rootDir, 'sitemap-log.txt');

// 🔄 Load SEO configuration from external JSON
let pageConfig = {};
try {
  pageConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'seo-config.json'), 'utf8'));
} catch (err) {
  console.warn('⚠️ seo-config.json not found or invalid. All pages will use default SEO values.');
}

const excludePaths = ['404.html', 'temp/', 'build/'];

function scanHtmlFilesRecursive(dir, baseDir = dir, exclude = []) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    const isExcluded = exclude.some((pattern) =>
      pattern.endsWith('/') ? relPath.startsWith(pattern) : relPath === pattern
    );

    if (isExcluded) continue;

    if (stat.isDirectory()) {
      files = files.concat(scanHtmlFilesRecursive(fullPath, baseDir, exclude));
    } else if (file.endsWith('.html')) {
      files.push(relPath);
    }
  }

  return files;
}

function pingSearchEngine(name, url) {
  https
    .get(url, (res) => {
      console.log(`📡 Pinged ${name}: ${res.statusCode} ${res.statusMessage}`);
    })
    .on('error', (err) => {
      console.error(`❌ Failed to ping ${name}:`, err.message);
    });
}

async function generateSitemap() {
  const htmlFiles = scanHtmlFilesRecursive(rootDir, rootDir, excludePaths);
  const defaultPriority = '0.7';
  const defaultChangefreq = 'monthly';
  let manuallyConfiguredCount = 0;
  const defaultedPages = [];
  const logLines = [];

  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const file of htmlFiles) {
    const urlPath = file === 'index.html' ? '' : file;
    const loc = baseUrl + urlPath;

    let lastMod;
    try {
      const stats = await fs.promises.stat(path.join(rootDir, file));
      lastMod = stats.mtime.toISOString();
    } catch {
      lastMod = new Date().toISOString();
    }

    const config = pageConfig[file];
    const priority = config?.priority || defaultPriority;
    const changefreq = config?.changefreq || defaultChangefreq;

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
      logLines.push(`⚠️  ${file} → using default priority (${defaultPriority}) and changefreq (${defaultChangefreq})`);
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
  console.error('Unhandled error during sitemap generation:', err);
});
