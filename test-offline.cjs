const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  const filePath = 'file://' + path.resolve('test_assembled.html');
  console.log('Opening', filePath);
  
  await page.goto(filePath, { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log('Root content preview:', content.substring(0, 500));
  await page.screenshot({ path: 'test_assembled.png' });
  
  await browser.close();
})();
