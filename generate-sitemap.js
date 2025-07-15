const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const baseUrl = 'https://project-callisto.vercel.app/';

const rootDir = __dirname;
const pagesDir = path.join(rootDir, 'pages');

const pageConfig = {
  'index.html': { priority: '1.0', changefreq: 'monthly' },
  'about.html': { priority: '0.8', changefreq: 'monthly' },
  'character.html': { priority: '0.9', changefreq: 'monthly' },
  'concept.html': { priority: '0.9', changefreq: 'monthly' },
  'race.html': { priority: '0.9', changefreq: 'monthly' },
  'series.html': { priority: '0.9', changefreq: 'monthly' },
  'technology.html': { priority: '0.9', changefreq: 'monthly' },
  'timeline.html': { priority: '0.8', changefreq: 'monthly' },
  'credits.html': { priority: '0.4', changefreq: 'yearly' },
  'legal.html': { priority: '0.4', changefreq: 'yearly' },
  'contact.html': { priority: '0.4', changefreq: 'yearly' },
  'license.html': { priority: '0.4', changefreq: 'yearly' }
};

// Helper to find HTML files in a directory
function scanHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.html'));
}

// Get all .html files
const rootPages = fs.existsSync(path.join(rootDir, 'index.html')) ? ['index.html'] : [];
const pageFiles = rootPages.concat(scanHtmlFiles(pagesDir));

// Start building XML
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

pageFiles.forEach(page => {
  const filePath = (page === 'index.html')
    ? path.join(rootDir, page)
    : path.join(pagesDir, page);

  let lastModDate;
  try {
    const stats = fs.statSync(filePath);
    lastModDate = stats.mtime.toISOString();
  } catch {
    lastModDate = new Date().toISOString();
  }

  const loc = (page === 'index.html')
    ? baseUrl
    : `${baseUrl}pages/${page}`; // ✅ Keeps .html + adds folder

  const config = pageConfig[page] || { priority: '0.5', changefreq: 'weekly' };

  sitemapContent += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastModDate}</lastmod>
    <changefreq>${config.changefreq}</changefreq>
    <priority>${config.priority}</priority>
  </url>`;
});

sitemapContent += `
</urlset>`;

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapContent.trim());
console.log('✅ sitemap.xml generated successfully!');
