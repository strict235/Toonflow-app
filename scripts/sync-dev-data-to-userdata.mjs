import fs from "fs";
import path from "path";

const TARGET_ENTRIES = ["assets", "models", "serve", "skills", "web", "vendor"];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

const srcRoot = path.join(process.cwd(), "data");
const destRoot = path.join(process.env.APPDATA, "toonflow", "data");

for (const dir of TARGET_ENTRIES) {
  copyDir(path.join(srcRoot, dir), path.join(destRoot, dir));
}

console.log("Synced project data ->", destRoot);
