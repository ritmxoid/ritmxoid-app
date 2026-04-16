import fs from 'fs';
import path from 'path';
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

const processCss = async (cssUrl) => {
  let css = (await download(cssUrl)).toString();
  const urlRegex = /url\((['"]?)([^'"\)]+)\1\)/g;
  let match;
  const urls = [];
  while ((match = urlRegex.exec(css)) !== null) {
    urls.push(match[2]);
  }
  
  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)].filter(url => !url.startsWith('data:'));
  
  console.log(`Found ${uniqueUrls.length} fonts to download from ${cssUrl}`);
  
  const replacements = await Promise.all(uniqueUrls.map(async (fontUrl) => {
    let absoluteUrl = fontUrl;
    if (fontUrl.startsWith('//')) {
      absoluteUrl = 'https:' + fontUrl;
    } else if (fontUrl.startsWith('/')) {
      const urlObj = new URL(cssUrl);
      absoluteUrl = urlObj.origin + fontUrl;
    } else if (!fontUrl.startsWith('http')) {
      const urlObj = new URL(cssUrl);
      const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
      absoluteUrl = urlObj.origin + basePath + fontUrl;
    }
    
    try {
      console.log('Downloading font:', absoluteUrl);
      const fontData = await download(absoluteUrl);
      const base64 = fontData.toString('base64');
      const ext = absoluteUrl.split('?')[0].split('.').pop();
      let mimeType = 'font/woff2';
      if (ext === 'woff') mimeType = 'font/woff';
      if (ext === 'ttf') mimeType = 'font/ttf';
      if (ext === 'eot') mimeType = 'application/vnd.ms-fontobject';
      
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return { fontUrl, dataUrl };
    } catch (e) {
      console.error('Failed to download font:', absoluteUrl, e.message);
      return { fontUrl, dataUrl: fontUrl }; // fallback to original
    }
  }));
  
  for (const { fontUrl, dataUrl } of replacements) {
    css = css.split(fontUrl).join(dataUrl);
  }
  
  return css;
};

async function build() {
  console.log('Building offline version...');
  
  // 1. Build with Vite
  execSync('npx vite build --config vite.offline.config.ts', { stdio: 'inherit' });
  
  // 2. Read dist/index.html
  let html = fs.readFileSync('dist/index.html', 'utf-8');
  
  // Remove dead index.css link if it exists
  html = html.replace('<link rel="stylesheet" href="/index.css">', '');
  
  // 3. Process Tailwind
  console.log('Processing Tailwind...');
  const tailwindScript = await download('https://cdn.tailwindcss.com');
  // We need to replace </script> inside the tailwind script with something else
  // so it doesn't close the script tag prematurely.
  // We can use string concatenation: '<' + '/script>'
  const safeTailwindScript = tailwindScript.toString().replace(/<\/script>/g, "<' + '/script>");
  html = html.replace('<script src="https://cdn.tailwindcss.com"></script>', () => `<script>${safeTailwindScript}</script>`);
  
  // 4. Process FontAwesome
  console.log('Processing FontAwesome...');
  const faCss = await processCss('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
  html = html.replace('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />', () => `<style>${faCss}</style>`);
  
  // 5. Process Google Fonts
  console.log('Processing Google Fonts...');
  const gfCss = await processCss('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
  html = html.replace("@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');", () => gfCss);
  
  // 6. Save as index_offline.html
  fs.writeFileSync('index_offline.html', html);
  console.log('Successfully created index_offline.html!');
}

build().catch(console.error);
