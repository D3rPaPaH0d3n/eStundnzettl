import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname Workaround für ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.json einlesen (Quelle der Wahrheit)
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

console.log(`\n🔄 Synchronisiere Version auf: ${newVersion}...\n`);

let hasChanges = false;

// --- A) UPDATE src/hooks/constants.js (MIT "v" PREFIX) ---
const utilsPath = path.join(__dirname, '../src/hooks/constants.js');
if (fs.existsSync(utilsPath)) {
    let utilsContent = fs.readFileSync(utilsPath, 'utf8');
    
    const utilsRegex = /export const APP_VERSION = ".*";/;
    if (utilsRegex.test(utilsContent)) {
        utilsContent = utilsContent.replace(utilsRegex, `export const APP_VERSION = "v${newVersion}";`);
        fs.writeFileSync(utilsPath, utilsContent);
        console.log(`✅ src/hooks/constants.js → v${newVersion}`);
        hasChanges = true;
    } else {
        console.error("⚠️  WARNUNG: APP_VERSION in src/hooks/constants.js nicht gefunden.");
    }
} else {
    console.error("⚠️  WARNUNG: src/hooks/constants.js nicht gefunden.");
}

// --- B) UPDATE android/app/build.gradle (OHNE "v" PREFIX) ---
const gradlePath = path.join(__dirname, '../android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');
    
    // versionName ersetzen
    gradleContent = gradleContent.replace(
        /versionName ".*"/, 
        `versionName "${newVersion}"`
    );

    // versionCode +1 erhöhen
    let oldCode, newCode;
    gradleContent = gradleContent.replace(/versionCode (\d+)/, (match, code) => {
        oldCode = parseInt(code);
        newCode = oldCode + 1;
        return `versionCode ${newCode}`;
    });

    fs.writeFileSync(gradlePath, gradleContent);
    console.log(`✅ build.gradle → versionName "${newVersion}", versionCode ${oldCode} → ${newCode}`);
    hasChanges = true;
} else {
    console.error("⚠️  WARNUNG: android/app/build.gradle nicht gefunden.");
}

// --- C) Dateien für Git stagen (wichtig für npm version Hook!) ---
if (hasChanges) {
    const { execSync } = await import('child_process');
    try {
        const filesToStage = [];
        if (fs.existsSync(utilsPath)) filesToStage.push('src/hooks/constants.js');
        if (fs.existsSync(gradlePath)) filesToStage.push('android/app/build.gradle');
        
        if (filesToStage.length > 0) {
            execSync(`git add ${filesToStage.join(' ')}`, { cwd: path.join(__dirname, '..') });
            console.log(`\n📦 Dateien gestaged: ${filesToStage.join(', ')}`);
        }
    } catch (e) {
        console.error("⚠️  Git staging fehlgeschlagen:", e.message);
    }
}

console.log("\n🚀 Version Sync abgeschlossen!\n");