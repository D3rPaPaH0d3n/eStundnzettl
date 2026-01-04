import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. __dirname Workaround für ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. package.json einlesen (Quelle der Wahrheit: z.B. "5.0.1")
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

console.log(`🔄 Synchronisiere Version auf: ${newVersion}...`);

// --- A) UPDATE src/utils.jsx (MIT "v" PREFIX) ---
const utilsPath = path.join(__dirname, '../src/hooks/constants.js');
if (fs.existsSync(utilsPath)) {
    let utilsContent = fs.readFileSync(utilsPath, 'utf8');
    
    // Suche nach: export const APP_VERSION = "...";
    // Und schreibe jetzt: "v5.0.1" statt nur "5.0.1"
    const utilsRegex = /export const APP_VERSION = ".*";/;
    if (utilsRegex.test(utilsContent)) {
        utilsContent = utilsContent.replace(utilsRegex, `export const APP_VERSION = "v${newVersion}";`);
        fs.writeFileSync(utilsPath, utilsContent);
        console.log(`✅ src/utils.jsx aktualisiert (jetzt mit 'v').`);
    } else {
        console.error("⚠️ WARNUNG: APP_VERSION in src/utils.jsx nicht gefunden.");
    }
}

// --- B) UPDATE android/app/build.gradle (OHNE "v" PREFIX, sauber für Play Store) ---
const gradlePath = path.join(__dirname, '../android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');

    // 1. versionName ersetzen (bleibt sauber "5.0.1")
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