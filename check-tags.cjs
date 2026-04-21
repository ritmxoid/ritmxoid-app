const fs = require('fs');
const content = fs.readFileSync('test_assembled.html', 'utf8');

// Look for <script src="..."
// <link href="..."
// <img src="http..."
// url("http...")

const srcMatches = content.match(/src=["'](https?:\/\/[^"']+)["']/g);
const hrefMatches = content.match(/href=["'](https?:\/\/[^"']+)["']/g);
const urlMatches = content.match(/url\(["']?(https?:\/\/[^)"']+)["']?\)/g);

console.log('src:', srcMatches);
console.log('href:', hrefMatches);
console.log('url:', urlMatches);
