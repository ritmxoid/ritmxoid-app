const fs = require('fs');
const content = fs.readFileSync('test_assembled.html', 'utf8');
const urls = new Set();
let match;
const regex = /(?:https?:)?\/\/[^\s\"\'\)]+/g;
while ((match = regex.exec(content)) !== null) {
  urls.add(match[0]);
}

const safeUrls = [
  'react.dev', 'w3.org', 'reactjs.org', 'tc39.es', 'github.com', 'npmjs.com'
];

console.log('External URLs found:');
for (const url of urls) {
  if (!safeUrls.some(safe => url.includes(safe))) {
    console.log(url);
  }
}
