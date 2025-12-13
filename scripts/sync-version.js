import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. __dirname Workaround für ES Modules (da es __dirname dort nicht gibt)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. package.json sicher einlesen
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

console.log(`🔄 Synchronisiere Version auf: ${newVersion}...`);

// --- A) UPDATE src/utils.jsx ---
const utilsPath = path.join(__dirname, '../src/utils.jsx');
if (fs.existsSync(utilsPath)) {
    let utilsContent = fs.readFileSync(utilsPath, 'utf8');
    
    // Suche nach: export const APP_VERSION = "..."; und ersetze es
    const utilsRegex = /export const APP_VERSION = ".*";/;
    if (utilsRegex.test(utilsContent)) {
        utilsContent = utilsContent.replace(utilsRegex, `export const APP_VERSION = "${newVersion}";`);
        fs.writeFileSync(utilsPath, utilsContent);
        console.log(`✅ src/utils.jsx aktualisiert.`);
    } else {
        console.error("⚠️ WARNUNG: APP_VERSION in src/utils.jsx nicht gefunden.");
    }
}

// --- B) UPDATE android/app/build.gradle ---
const gradlePath = path.join(__dirname, '../android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');

    // 1. versionName ersetzen
    gradleContent = gradleContent.replace(
        /versionName ".*"/, 
        `versionName "${newVersion}"`
    );

    // 2. versionCode automatisch +1 erhöhen
    gradleContent = gradleContent.replace(/versionCode (\d+)/, (match, code) => {
        const newCode = parseInt(code) + 1;
        console.log(`✅ Android versionCode erhöht: ${code} -> ${newCode}`);
        return `versionCode ${newCode}`;
    });

    fs.writeFileSync(gradlePath, gradleContent);
    console.log(`✅ android/app/build.gradle aktualisiert.`);
} else {
    console.error("⚠️ WARNUNG: build.gradle nicht gefunden.");
}

console.log("🚀 Version Sync abgeschlossen!");