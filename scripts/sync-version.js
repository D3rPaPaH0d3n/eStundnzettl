import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");

const packageJsonPath = path.join(repoRoot, "package.json");
const packageLockPath = path.join(repoRoot, "package-lock.json");
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

// package-lock.json als Sicherheitsnetz mit-syncen. npm version würde das
// normalerweise selbst erledigen, aber bei manuellen Edits an package.json
// bleibt das Lockfile sonst zurück (siehe v4.0.0-Drift).
if (fs.existsSync(packageLockPath)) {
  const lockRaw = fs.readFileSync(packageLockPath, "utf8");
  const lock = JSON.parse(lockRaw);
  const oldLockVersion = lock.version;
  const rootPkg = lock.packages?.[""];

  if (oldLockVersion !== newVersion || rootPkg?.version !== newVersion) {
    lock.version = newVersion;
    if (rootPkg) rootPkg.version = newVersion;

    // Trailing newline beibehalten, falls vorhanden (npm schreibt einen).
    const trailingNewline = lockRaw.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(
      packageLockPath,
      JSON.stringify(lock, null, 2) + trailingNewline
    );
    console.log(`package-lock.json -> version ${oldLockVersion} -> ${newVersion}`);
  } else {
    console.log(`package-lock.json -> bereits auf ${newVersion}, nichts zu tun`);
  }
}

console.log("\nHinweis: Der Changelog bleibt bewusst manuell gepflegt, damit er menschlich bleibt.\n");
