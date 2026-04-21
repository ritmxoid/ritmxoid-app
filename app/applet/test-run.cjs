const puppeteer = require('puppeteer');
const fs = require('fs');

fs.writeFileSync('test-module.html', `<!DOCTYPE html>
<html>
<body>
  <script type="module">
    document.body.innerHTML += "<h2>Module executed</h2>";
  </script>
</body>
</html>`);

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--allow-file-access-from-files']});
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test-module.html');
  const txt = await page.content();
  console.log('Result:', txt.includes('Module executed') ? 'YES' : 'NO');
  await browser.close();
})();
