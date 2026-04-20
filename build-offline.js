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
  console.log('Starting Clean Full Offline Build (Lucide + Tailwind Bundled)...');
  
  // 1. Vite Build
  execSync('npx vite build --config vite.offline.config.ts', { stdio: 'inherit' });
  
  // 2. Read output
  let html = fs.readFileSync('dist/index.html', 'utf-8');
  
  // 3. Inline Roboto Fonts
  console.log('Inlining Roboto fonts...');
  try {
    const robotoCss = await processFonts('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    // Replace the Google Fonts link/import with inlined CSS
    // Vite minifier completely drops url() and space: @import"https://..."
    const fontPattern = /@import\s*(?:url\()?(['"]?)https:\/\/fonts\.googleapis\.com\/css2\?family=Roboto:wght@300;400;500;700&display=swap\1\)?\s*;/;
    if (fontPattern.test(html)) {
      html = html.replace(fontPattern, robotoCss);
      console.log('Successfully replaced @import with inline Roboto fonts.');
    } else {
      // Fallback: just append it to head if pattern match fails
      html = html.replace('</head>', `<style>${robotoCss}</style></head>`);
      console.warn('Warning: Could not find @import for Roboto, appended to <head>. Offline might be delayed by failed network request.');
    }
  } catch (e) {
    console.error('Failed to inline Roboto fonts, keeping online link.', e.message);
  }

  // 4. Clean up Vite's added attributes that break local file:// execution.
  // We MUST keep type="module" because Vite target: "esnext" generates ESM features like import.meta and top-level await!
  // But we MUST remove crossorigin so it doesn't fail on file:// origin null.
  html = html.replace(/<script type="module" crossorigin(.*?)>/g, '<script type="module"$1>');
  html = html.replace(/<style rel="stylesheet" crossorigin(.*?)>/g, '<style rel="stylesheet"$1>');

  // 5. Final Output
  // Use char length instead of byte size for correct JS string indexing!
  const size = html.length;
  console.log(`\nDONE! Final HTML character length: ${size}`);

  // Split into parts automatically based on a max size (1.5 million characters ~ 1.5MB to stay well under 1.95MB limit)
  const MAX_PART_SIZE = 1500000;
  const numParts = Math.ceil(size / MAX_PART_SIZE);
  console.log(`Splitting into ${numParts} text files for offline manual construction...`);
  
  // Clean up existing part files and re-create
  const existingParts = fs.readdirSync('public').filter(f => f.startsWith('part') && f.endsWith('.txt'));
  for (const file of existingParts) {
    fs.unlinkSync(`public/${file}`);
  }

  for (let i = 0; i < numParts; i++) {
    const start = i * MAX_PART_SIZE;
    const end = Math.min((i + 1) * MAX_PART_SIZE, size);
    fs.writeFileSync(`public/part${i + 1}.txt`, html.substring(start, end));
    console.log(`Created part${i + 1}.txt: ${html.substring(start, end).length} characters`);
  }
}

build().catch(console.error);
