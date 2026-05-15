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
 * Hinweis: Die Changelog-Dateien enthalten nur statische Daten. Wir parsen
 * sie bewusst als TypeScript-AST und akzeptieren nur Literal-Strukturen,
 * damit Release-Workflows keinen Source-Code ausführen müssen.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
    return loadArrayLiteral(resolve(REPO_ROOT, "src/data/changelog-data.de.ts"), "CHANGELOG_DATA_DE");
  }
  if (lang === "en") {
    // EN file declares only the translated entries, then maps them
    // onto the DE list with DE as fallback. We replicate that here.
    const translatedEn = loadArrayLiteral(resolve(REPO_ROOT, "src/data/changelog-data.en.ts"), "TRANSLATED_EN");
    const baseDe = loadArrayLiteral(resolve(REPO_ROOT, "src/data/changelog-data.de.ts"), "CHANGELOG_DATA_DE");
    return baseDe.map((de) => translatedEn.find((en) => en && en.version === de.version) || de);
  }
  throw new Error(`Unsupported lang: ${lang} (supported: de, en)`);
}

/**
 * Reads a file, finds a variable declaration, and converts its initializer
 * only if it is made of safe literals: arrays, objects, strings, numbers,
 * booleans and null. Calls, identifiers, spreads, templates, and functions
 * are rejected instead of being evaluated.
 */
function loadArrayLiteral(path, variableName) {
  const text = readFileSync(path, "utf8");
  const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let initializer = null;

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!initializer) throw new Error(`Could not find ${variableName} in ${path}`);

  const arr = literalToValue(initializer, path);
  if (!Array.isArray(arr)) throw new Error(`Parsed value is not an array in ${path}`);
  return arr;
}

function literalToValue(node, path) {
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => {
      if (ts.isSpreadElement(element)) throw new Error(`Spread elements are not supported in ${path}`);
      return literalToValue(element, path);
    });
  }

  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`Only plain object properties are supported in ${path}`);
      }
      out[propertyNameToString(property.name, path)] = literalToValue(property.initializer, path);
    }
    return out;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    const value = Number(node.operand.text);
    if (node.operator === ts.SyntaxKind.MinusToken) return -value;
    if (node.operator === ts.SyntaxKind.PlusToken) return value;
  }

  throw new Error(`Unsupported non-literal changelog expression in ${path}: ${node.getText()}`);
}

function propertyNameToString(name, path) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw new Error(`Unsupported object property name in ${path}: ${name.getText()}`);
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
