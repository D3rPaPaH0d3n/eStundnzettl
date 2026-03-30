import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");

const packageJsonPath = path.join(repoRoot, "package.json");
const gradlePath = path.join(repoRoot, "android/app/build.gradle");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const newVersion = packageJson.version;

console.log(`\nSynchronisiere Release-Stand auf ${newVersion} ...\n`);

if (!fs.existsSync(gradlePath)) {
  console.error("android/app/build.gradle wurde nicht gefunden.");
  process.exit(1);
}

let gradleContent = fs.readFileSync(gradlePath, "utf8");

gradleContent = gradleContent.replace(
  /versionName ".*"/,
  `versionName "${newVersion}"`
);

let oldCode = null;
let newCode = null;

gradleContent = gradleContent.replace(/versionCode (\d+)/, (_, code) => {
  oldCode = Number.parseInt(code, 10);
  newCode = oldCode + 1;
  return `versionCode ${newCode}`;
});

fs.writeFileSync(gradlePath, gradleContent);

console.log(`build.gradle -> versionName "${newVersion}"`);
console.log(`build.gradle -> versionCode ${oldCode} -> ${newCode}`);
console.log("\nHinweis: Der Changelog bleibt bewusst manuell gepflegt, damit er menschlich bleibt.\n");
