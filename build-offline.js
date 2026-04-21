import fs from 'fs';
import { execSync } from 'child_process';

const download = async (url) => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
};

const processFonts = async (cssUrl) => {
  console.log(`Processing fonts from ${cssUrl}...`);
  let css = (await download(cssUrl)).toString();
  const urlRegex = /url\((['"]?)([^'"\)]+)\1\)/g;
  let match;
  const urls = [];
  while ((match = urlRegex.exec(css)) !== null) {
    urls.push(match[2]);
  }
  
  const uniqueUrls = [...new Set(urls)].filter(url => !url.startsWith('data:'));
  console.log(`Found ${uniqueUrls.length} font files to inline.`);
  
  const replacements = await Promise.all(uniqueUrls.map(async (fontUrl) => {
    try {
      console.log('  Inlining font:', fontUrl);
      const fontData = await download(fontUrl);
      const base64 = fontData.toString('base64');
      const ext = fontUrl.split('?')[0].split('.').pop();
      let mimeType = 'font/woff2';
      if (ext === 'woff') mimeType = 'font/woff';
      if (ext === 'ttf') mimeType = 'font/ttf';
      
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return { fontUrl, dataUrl };
    } catch (e) {
      console.error('  Failed to inline font:', fontUrl, e.message);
      return { fontUrl, dataUrl: fontUrl };
    }
  }));
  
  for (const { fontUrl, dataUrl } of replacements) {
    css = css.split(fontUrl).join(dataUrl);
  }
  
  return css;
};

async function build() {
  console.log('Starting Clean Full Offline Build (Total Zero-Internet Mode)...');
  
  // 1. Vite Build
  console.log('Running Vite build with SingleFile plugin...');
  execSync('npx vite build --config vite.offline.config.ts', { stdio: 'inherit' });
  
  // 2. Read output
  let html = fs.readFileSync('dist/index.html', 'utf-8');
  
  // 3. Remove Google Analytics and any other external scripts
  console.log('Removing Google Analytics and external script tags...');
  html = html.replace(/<script\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^>]*><\/script>/gi, '');
  // Using [^<]* ensures we don't accidentally match across different tags and delete half the document
  html = html.replace(/<script>[^<]*window\.dataLayer\s*=[^<]*dataLayer\.push[^<]*<\/script>/gi, '<!-- Analytics Removed -->');
  
  // 4. Inline Roboto Fonts
  console.log('Inlining Roboto fonts and other Google Fonts...');
  try {
    // Collect all unique font imports from index.css or the built HTML dynamically
    const fontRegex = /@import\s*(?:url\()?['"]?(https:\/\/fonts\.googleapis\.com\/[^\s'")]+)['"]?\)?\s*;?/g;
    const fontMatches = [];
    let match;
    while ((match = fontRegex.exec(html)) !== null) {
      fontMatches.push({ fullMatch: match[0], url: match[1] });
    }

    if (fontMatches.length === 0) {
      console.log('No Google Fonts imports found in HTML.');
    }

    for (const { fullMatch, url } of fontMatches) {
      console.log(`Processing: ${url}`);
      let fontCss = '';
      try {
        fontCss = await processFonts(url);
      } catch(err) {
        console.error('Failed to process font:', url, err.message);
        // Continue without blocking
      }
      
      // Replace the exact matching @import with the base64 CSS
      html = html.replace(fullMatch, fontCss + '\n');
      console.log(`Successfully replaced @import for ${url}`);
    }
  } catch (e) {
    console.error('Failed to inline fonts, but continuing...', e.message);
  }

  // 5. Clean up Vite attributes that break file:// execution
  console.log('Cleaning up script and style attributes for local execution...');
  // Force removal of type="module" to prevent file:// CORS restrictions
  html = html.replace(/<script type="module"[^>]*>/g, '<script type="module">');
  html = html.replace(/<style rel="stylesheet"[^>]*>/g, '<style>');
  html = html.replace(/<link rel="stylesheet" crossorigin(.*?)>/g, '<link rel="stylesheet"$1>');
  
  // Inject an on-screen error handler so the user doesn't just see a white page
  const errorHandler = `
<script>
  function showError(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'color:red; background:white; position:fixed; top:0; left:0; z-index:9999; padding:20px; font-family:monospace; font-size:14px; max-width:100vw; overflow:auto;';
    el.innerHTML = msg;
    if (document.body) { document.body.appendChild(el); }
    else { document.documentElement.appendChild(el); }
  }
  window.addEventListener('error', function(e) {
    showError('<b>Runtime Error:</b><br/>' + e.message + '<br/>' + e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    showError('<b>Promise Rejection:</b><br/>' + (e.reason && e.reason.message || e.reason || 'Unknown Rejection'));
  });
</script>
  `.trim();
  if (html.includes('</title>')) {
    html = html.replace('</title>', '</title>\n' + errorHandler);
  } else {
    html = html.replace(/<\/head>(?![\s\S]*<\/head>)/i, errorHandler + '\n</head>');
  }
  
  
  // 6. Final Size Analysis
  const size = html.length;
  console.log(`\nDONE! Final HTML character length: ${size}`);

  // 7. Split into parts for manual transfer
  // Limit to 1.9MB per part (1,900,000 characters is safe for 1.95MB limit)
  const MAX_PART_SIZE = 1900000; 
  const numParts = Math.ceil(size / MAX_PART_SIZE);
  console.log(`Splitting into ${numParts} text files (max ${MAX_PART_SIZE} chars each)...`);
  
  const outputDir = 'dist_parts';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  // Clean up old parts
  const oldFiles = fs.readdirSync(outputDir);
  for (const f of oldFiles) fs.unlinkSync(path.join(outputDir, f));

  for (let i = 0; i < numParts; i++) {
    const start = i * MAX_PART_SIZE;
    const end = Math.min((i + 1) * MAX_PART_SIZE, size);
    const partContent = html.substring(start, end);
    const fileName = `Offline_Part_${i + 1}.txt`;
    fs.writeFileSync(path.join(outputDir, fileName), partContent);
    console.log(`Created ${fileName}: ${partContent.length} characters`);
  }
  
  // Also create a "Reconstruction Manual.txt"
  const manual = `HOW TO RECONSTRUCT THE OFFLINE APP:
1. Open all Offline_Part_X.txt files.
2. Create a new file named "RitmXoid_Offline.html".
3. Copy and paste the content of Part 1, then Part 2, etc., in order.
4. Save the file.
5. Open "RitmXoid_Offline.html" in any modern browser (Chrome, Firefox, Safari).
6. No internet connection is required.`;
  fs.writeFileSync(path.join(outputDir, 'RECONSTRUCT_MANUAL.txt'), manual);

  console.log(`\nAll files are ready in the "${outputDir}" directory.`);
}

import path from 'path';

build().catch(console.error);
