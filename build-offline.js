import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

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
  html = html.replace(/<script>[^<]*window\.dataLayer\s*=[^<]*dataLayer\.push[^<]*<\/script>/gi, '<!-- Analytics Removed -->');
  
  // 4. Inlining local assets (CSS, Fonts, Images) that vite-plugin-singlefile might miss
  console.log('Performing Super Inlining of local assets...');
  
  // Resolve paths relative to dist
  const distDir = path.resolve('dist');
  
  // Regex to find all url() in the HTML (which contains inlined CSS)
  const urlRegex = /url\((['"]?)([^'"\)]+)\1\)/g;
  let match;
  const assetsToInline = [];
  while ((match = urlRegex.exec(html)) !== null) {
    const assetPath = match[2];
    if (!assetPath.startsWith('data:') && !assetPath.startsWith('http')) {
      assetsToInline.push(assetPath);
    }
  }
  
  const uniqueAssets = [...new Set(assetsToInline)];
  console.log(`Found ${uniqueAssets.length} local assets in CSS to inline.`);
  
  for (const assetPath of uniqueAssets) {
    try {
      // Try to find the file in dist/assets or dist
      let fullPath = path.join(distDir, assetPath);
      if (!fs.existsSync(fullPath)) {
        // Sometimes paths are like assets/file.woff2 but they are relative to CSS
        fullPath = path.join(distDir, 'assets', path.basename(assetPath));
      }
      
      if (fs.existsSync(fullPath)) {
        console.log(`  Inlining local asset: ${assetPath}`);
        const data = fs.readFileSync(fullPath);
        const base64 = data.toString('base64');
        const ext = path.extname(fullPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.woff2') mimeType = 'font/woff2';
        if (ext === '.woff') mimeType = 'font/woff';
        if (ext === '.ttf') mimeType = 'font/ttf';
        if (ext === '.svg') mimeType = 'image/svg+xml';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        
        const dataUrl = `data:${mimeType};base64,${base64}`;
        // Escape for regex use
        const escapedPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(escapedPath, 'g'), dataUrl);
      }
    } catch (err) {
      console.warn(`  Failed to inline asset ${assetPath}:`, err.message);
    }
  }

  // 4.5. Inline Roboto Fonts from Google
  console.log('Inlining remaining Google Fonts...');
  try {
    const fontRegex = /@import\s*(?:url\()?['"]?(https:\/\/fonts\.googleapis\.com\/[^\s'")]+)['"]?\)?\s*;?/g;
    const fontMatches = [];
    let fMatch;
    while ((fMatch = fontRegex.exec(html)) !== null) {
      fontMatches.push({ fullMatch: fMatch[0], url: fMatch[1] });
    }

    for (const { fullMatch, url } of fontMatches) {
      console.log(`Processing Google Font: ${url}`);
      const fontCss = await processFonts(url);
      html = html.replace(fullMatch, fontCss + '\n');
    }
  } catch (e) {
    console.warn('Failed to inline Google fonts:', e.message);
  }

  // 5. Clean up Vite attributes that break file:// execution
  console.log('Cleaning up script and style attributes for local execution...');
  
  // Safely remove crossorigin and integrity only from HTML tags, not from JS code!
  html = html.replace(/<(script|link|style)([^>]*)>/gi, (match, tag, attrs) => {
    let cleanAttrs = attrs.replace(/\s+crossorigin(?:=['"]?[^'">\s]*['"]?)?/gi, '');
    cleanAttrs = cleanAttrs.replace(/\s+integrity=['"]?[^'">\s]*['"]?/gi, '');
    // Remove rel="stylesheet" from <style> tags (vite-singlefile bug)
    if (tag.toLowerCase() === 'style') {
      cleanAttrs = cleanAttrs.replace(/\s+rel=['"]?stylesheet['"]?/gi, '');
    }
    return `<${tag}${cleanAttrs}>`;
  });
  
  // Ensure all styles are really inlined
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (match, href) => {
    const fullPath = path.join(distDir, href);
    if (fs.existsSync(fullPath)) {
      console.log(`  Forcing inline of late CSS: ${href}`);
      const css = fs.readFileSync(fullPath, 'utf-8');
      return `<style>${css}</style>`;
    }
    return match;
  });
  
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

build().catch(console.error);
