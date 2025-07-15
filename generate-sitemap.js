const fs = require('fs');
const path = require('path');

const baseUrl = 'https://project-callisto.vercel.app/';
const rootDir = __dirname; // adjust if your HTML files live elsewhere

// Recursively scan for .html files, return relative paths
function scanHtmlFilesRecursive(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(scanHtmlFilesRecursive(fullPath, baseDir));
    } else if (file.endsWith('.html')) {
      // Relative path for URL building, normalize slashes
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(relativePath);
    }
  });

  return files;
}

// Scan for all html pages under rootDir
const htmlFiles = scanHtmlFilesRecursive(rootDir);

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

htmlFiles.forEach((file) => {
  let urlPath = file;

  // Map root index.html to base URL (no filename)
  if (urlPath === 'index.html') {
    urlPath = '';
  }

  const loc = baseUrl + urlPath;

  // Get last modified date of the file
  let lastModDate;
  try {
    const stats = fs.statSync(path.join(rootDir, file));
    lastModDate = stats.mtime.toISOString();
  } catch {
    lastModDate = new Date().toISOString();
  }

  // Simple SEO config: you can customize priorities/frequencies here if you want
  const changefreq = 'monthly';
  const priority = urlPath === '' ? '1.0' : '0.7';

  sitemapContent += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastModDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

sitemapContent += `
</urlset>`;

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapContent.trim());

console.log('✅ sitemap.xml generated successfully!');
