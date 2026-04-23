import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const fontFaceMatch = html.match(/@font-face\s*\{[^}]*Font Awesome[^}]*\}/gi);
if (fontFaceMatch) {
  fontFaceMatch.forEach((ff, i) => {
    const srcMatch = ff.match(/src:[^;]+;/);
    console.log(`@font-face ${i} src:`, srcMatch ? srcMatch[0].substring(0, 150) : "NO SRC");
  });
} else {
  console.log("NO @font-face FA");
}
