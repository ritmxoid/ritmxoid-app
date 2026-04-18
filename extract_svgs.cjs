const fs = require("fs");
const file = fs.readFileSync("Offline_App.html", "utf8");
const svgs = file.match(/<svg[\s\S]*?<\/svg>/g);
if (svgs) {
  svgs.forEach((svg, i) => fs.writeFileSync(`svg_${i}.txt`, svg));
  console.log(`Found ${svgs.length} SVGs`);
} else {
  console.log("No SVGs found");
}
