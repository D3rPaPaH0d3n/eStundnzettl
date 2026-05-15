#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const summaryPath = process.argv[2] ?? "coverage/coverage-summary.json";
const outputPath = process.argv[3] ?? "badges/coverage.svg";

const raw = await readFile(summaryPath, "utf8");
const summary = JSON.parse(raw);
const pct = Number(summary?.total?.lines?.pct ?? 0);

const label = "coverage";
const value = `${pct.toFixed(1)}%`;
const color = pct >= 80 ? "#2ea44f" : pct >= 60 ? "#d29922" : "#6b7280";
const labelWidth = 72;
const valueWidth = Math.max(54, value.length * 8 + 14);
const width = labelWidth + valueWidth;

const escapeXml = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" role="img" aria-label="${escapeXml(`${label}: ${value}`)}">
  <title>${escapeXml(`${label}: ${value}`)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="28" rx="6" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="28" fill="#24292f"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="28" fill="${color}"/>
    <rect width="${width}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="700">
    <text x="${labelWidth / 2}" y="18">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="18">${escapeXml(value)}</text>
  </g>
</svg>
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");
console.log(`Wrote ${outputPath} (${value} lines coverage)`);
