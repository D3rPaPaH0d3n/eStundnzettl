import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\n⚠️  ACHTUNG: RELEASE VORBEREITUNG");
console.log("=================================");
console.log("Dieser Befehl wird:");
console.log("  1. Die App-Version erhöhen und lokal Commit + Tag erstellen");
console.log("  2. Lint, Typecheck, Tests, Web-Build und Android Sync ausführen");
console.log("  3. Nur bei erfolgreichen Checks Commit + Tag PUSHEN");
console.log("  4. Android Studio öffnen");
console.log("=================================");

rl.question('Möchtest du wirklich fortfahren? (y/n): ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log("🚀 Alles klar, Release startet...\n");
        process.exit(0); // 0 bedeutet "Erfolg" -> Der nächste Befehl darf laufen
    } else {
        console.log("❌ Abbruch durch Benutzer.");
        process.exit(1); // 1 bedeutet "Fehler" -> Die Kette stoppt sofort
    }
});