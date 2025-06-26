const fs = require('fs');
const path = require('path');

// --- IMPORTANT: CONFIGURE THESE SETTINGS ---
const baseUrl = 'https://project-callisto.vercel.app/'; // Your website's base URL

const pages = [
  'index.html',
  'about.html',
  'character.html',
  'concept.html',
  'race.html',
  'series.html',
  'technology.html',
  'timeline.html',
  'credits.html',
  'legal.html',
  'contact.html',
  'license.html'
];

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
// --- END CONFIGURATION ---

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

pages.forEach(page => {
  // Get the correct file path based on whether it's index.html or in /pages
  const filePath = (page === 'index.html')
    ? path.join(__dirname, page)
    : path.join(__dirname, 'pages', page);

  let lastModDate;

  try {
    const stats = fs.statSync(filePath);
    lastModDate = stats.mtime.toISOString(); // Now includes full ISO date and time
  } catch (error) {
    console.warn(`Could not get last modification date for ${page}. Using current date.`);
    lastModDate = new Date().toISOString().split('T')[0];
  }

  // Build the URL path
  const loc = (page === 'index.html') ? baseUrl : baseUrl + page.replace('.html', '');
  const config = pageConfig[page] || { priority: '0.5', changefreq: 'weekly' };

  // Add entry to sitemap
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

// Save sitemap.xml to the root of your project
fs.writeFileSync('sitemap.xml', sitemapContent.trim());
console.log('✅ sitemap.xml generated successfully!');
