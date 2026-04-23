import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { strToU8, zlibSync, strFromU8 } from 'fflate';

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
  console.log('Starting Compressed Standalone Build...');
  
  // 1. Vite Build
  console.log('Running Vite build...');
  execSync('npx vite build --config vite.offline.config.ts', { stdio: 'inherit' });
  
  // 2. Read output
  let html = fs.readFileSync('dist/index.html', 'utf-8');
  
  // 3. Remove Google Analytics
  html = html.replace(/<script\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^>]*><\/script>/gi, '');
  html = html.replace(/<script>[^<]*window\.dataLayer\s*=[^<]*dataLayer\.push[^<]*<\/script>/gi, '');
  
  // 4. Inlining local assets
  const distDir = path.resolve('dist');
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
  for (const assetPath of uniqueAssets) {
    try {
      let fullPath = path.join(distDir, assetPath);
      if (!fs.existsSync(fullPath)) {
        fullPath = path.join(distDir, 'assets', path.basename(assetPath));
      }
      
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath);
        const base64 = data.toString('base64');
        const ext = path.extname(fullPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.woff2') mimeType = 'font/woff2';
        if (ext === '.woff') mimeType = 'font/woff';
        if (ext === '.ttf') mimeType = 'font/ttf';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const escapedPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(escapedPath, 'g'), dataUrl);
      }
    } catch (err) {}
  }

  // 4.5. Inline Google Fonts
  try {
    const fontRegex = /@import\s*(?:url\()?['"]?(https:\/\/fonts\.googleapis\.com\/[^\s'")]+)['"]?\)?\s*;?/g;
    const fontMatches = [];
    let fMatch;
    while ((fMatch = fontRegex.exec(html)) !== null) {
      fontMatches.push({ fullMatch: fMatch[0], url: fMatch[1] });
    }
    for (const { fullMatch, url } of fontMatches) {
      const fontCss = await processFonts(url);
      html = html.replace(fullMatch, fontCss + '\n');
    }
  } catch (e) {}

  // 5. COMPRESSION MAGIC
  console.log('Compressing game data...');
  const compressed = zlibSync(strToU8(html), { level: 9 });
  const base64Data = Buffer.from(compressed).toString('base64');
  
  const loaderHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RitmXoid - Offline</title>
    <style>
        body { background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
        .loader { text-align: center; }
        .spinner { border: 4px solid rgba(255,255,255,0.1); border-left-color: #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <div>Загрузка игровых ресурсов...</div>
    </div>
    <script src="https://unpkg.com/fflate"></script>
    <script>
        // Fallback for fflate if unpkg is blocked (we should ideally inline fflate too)
        const COMPRESSED_DATA = "${base64Data}";
        
        async function launch() {
            try {
                // If unpkg is blocked, we can't decompress. Let's provide a local-first approach.
                // For a truly offline file, we need fflate inlined.
                if (typeof fflate === 'undefined') {
                    document.body.innerHTML = '<div style="padding:20px; color:red;">Ошибка: Не удалось загрузить модуль распаковки. Пожалуйста, убедитесь, что вы один раз открыли этот файл с интернетом или используйте версию с вшитым распаковщиком.</div>';
                    return;
                }
                
                const binary = Uint8Array.from(atob(COMPRESSED_DATA), c => c.charCodeAt(0));
                const decompressed = fflate.unzlibSync(binary);
                const html = new TextDecoder().decode(decompressed);
                
                document.open();
                document.write(html);
                document.close();
            } catch (err) {
                console.error(err);
                document.body.innerHTML = '<div style="padding:20px; color:red;">Ошибка при запуске игры: ' + err.message + '</div>';
            }
        }
        
        // Wait for fflate to load
        if (typeof fflate !== 'undefined') launch();
        else {
            const check = setInterval(() => {
                if (typeof fflate !== 'undefined') {
                    clearInterval(check);
                    launch();
                }
            }, 100);
            setTimeout(() => clearInterval(check), 5000);
        }
    </script>
</body>
</html>`;

  // We need to inline fflate to be 100% offline
  console.log('Inlining decompression engine...');
  const fflateCode = fs.readFileSync('node_modules/fflate/umd/index.js', 'utf-8');
  const finalHtml = loaderHtml.replace('<script src="https://unpkg.com/fflate"></script>', `<script>${fflateCode}</script>`);

  fs.writeFileSync('RitmXoid_SUPER_OFFLINE.html', finalHtml);
  
  console.log(`\nУСПЕХ! Финальный размер сжатого файла: ${(finalHtml.length / 1024).toFixed(2)} KB`);
  
  if (finalHtml.length > 1500000) {
      console.warn("Размер все еще велик, разделяю на 2 части...");
      const part1 = finalHtml.substring(0, finalHtml.length / 2);
      const part2 = finalHtml.substring(finalHtml.length / 2);
      fs.writeFileSync('READY_ONE_part1.txt', part1);
      fs.writeFileSync('READY_ONE_part2.txt', part2);
  } else {
      fs.writeFileSync('READY_SINGLE_FILE.txt', finalHtml);
      console.log("Создан файл READY_SINGLE_FILE.txt - просто скопируйте его целиком!");
  }
}

build().catch(console.error);
