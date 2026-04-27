#!/usr/bin/env node
/**
 * extract-changelog.mjs
 *
 * Liest src/data/changelog-data.{de,en}.ts und gibt den Eintrag für eine
 * gegebene Version als Markdown auf stdout aus. Wird vom GitHub-Release-
 * Workflow genutzt, damit das Release Notes denselben strukturierten
 * Inhalt wie das In-App-Changelog-Modal zeigt.
 *
 * Nutzung:
 *   node scripts/extract-changelog.mjs --version 4.2.1 --lang de
 *   node scripts/extract-changelog.mjs --version 4.2.1 --lang en
 *
 * Exit-Codes:
 *   0  Markdown wurde geschrieben (oder: Eintrag nicht gefunden, leerer Output)
 *   1  Fatal-Error (Datei nicht lesbar / nicht parsebar)
 *
 * Hinweis: Die Changelog-Dateien enthalten kein TypeScript ausser dem
 * `export const` — wir lesen die Datei als Text, isolieren das Array
 * und werten es via Function() aus. Vertrauen ist OK weil es nur unsere
 * eigene Source ist; nichts User-Generated.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");

function parseArgs(argv) {
  const out = { version: null, lang: "de" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--version") out.version = argv[++i];
    else if (a === "--lang") out.lang = argv[++i];
  }
  return out;
}

function loadChangelog(lang) {
  if (lang === "de") {
    return loadArrayLiteral(
      resolve(REPO_ROOT, "src/data/changelog-data.de.ts"),
      /export\s+const\s+CHANGELOG_DATA_DE\s*=\s*/,
    );
  }
  if (lang === "en") {
    // EN file declares only the translated entries, then maps them
    // onto the DE list with DE as fallback. We replicate that here.
    const translatedEn = loadArrayLiteral(
      resolve(REPO_ROOT, "src/data/changelog-data.en.ts"),
      /\bconst\s+TRANSLATED_EN\s*=\s*/,
    );
    const baseDe = loadArrayLiteral(
      resolve(REPO_ROOT, "src/data/changelog-data.de.ts"),
      /export\s+const\s+CHANGELOG_DATA_DE\s*=\s*/,
    );
    return baseDe.map((de) => translatedEn.find((en) => en && en.version === de.version) || de);
  }
  throw new Error(`Unsupported lang: ${lang} (supported: de, en)`);
}

/**
 * Reads a file and extracts a single array literal that starts after
 * `prefixRegex`, parses it via Function() as a JS expression. The array
 * literal must end at the matching `]` followed by `;` at column 0 of
 * its own line — which is how Prettier writes the changelog files.
 */
function loadArrayLiteral(path, prefixRegex) {
  const text = readFileSync(path, "utf8");
  const match = text.match(prefixRegex);
  if (!match) throw new Error(`Could not find prefix in ${path}`);
  const start = match.index + match[0].length;
  // Walk forward, count brackets to find the matching close.
  let depth = 0;
  let inString = null;
  let escape = false;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inString = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Unbalanced array literal in ${path}`);
  const body = text.slice(start, end);
  const arr = new Function(`return ${body};`)();
  if (!Array.isArray(arr)) throw new Error(`Parsed value is not an array in ${path}`);
  return arr;
}

function findEntry(entries, version) {
  return entries.find((e) => e && e.version === version) || null;
}

function entryToMarkdown(entry, lang) {
  if (!entry) return "";
  const lines = [];
  if (entry.title) lines.push(`**${entry.title}**`);
  if (entry.date) {
    const dateLabel = lang === "de" ? "Veröffentlicht" : "Released";
    lines.push(`_${dateLabel}: ${entry.date}_`);
  }
  lines.push("");
  for (const section of entry.sections || []) {
    lines.push(`### ${section.title}`);
    for (const item of section.items || []) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function main() {
  const { version, lang } = parseArgs(process.argv);
  if (!version) {
    process.stderr.write("Usage: extract-changelog.mjs --version <x.y.z> --lang <de|en>\n");
    process.exit(1);
  }
  let entries;
  try {
    entries = loadChangelog(lang);
  } catch (err) {
    process.stderr.write(`Could not load changelog (${lang}): ${err.message}\n`);
    process.exit(1);
  }
  const entry = findEntry(entries, version);
  if (!entry) {
    // Not an error — workflow falls back to fastlane changelogs.
    process.stderr.write(`No changelog entry found for version ${version} (${lang})\n`);
    process.exit(0);
  }
  process.stdout.write(entryToMarkdown(entry, lang));
}

main();
