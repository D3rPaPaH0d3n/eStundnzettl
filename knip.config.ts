import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.tsx'],
  project: ['src/**/*.{ts,tsx}'],
  ignoreDependencies: [
    // Capacitor plugins are used at runtime via native bridge
    '@capacitor/android',
    '@capacitor-community/date-picker',
    '@capgo/capacitor-social-login',
    // PostCSS integration handled by Tailwind
    'autoprefixer',
    'postcss',
    // Used in postinstall script
    'replace-in-files-cli',
    // Tailwind is used via @tailwindcss/vite plugin, not directly imported
    'tailwindcss',
    // Required transitively by @react-pdf/pdfkit's browser build, which
    // imports `pako/lib/zlib/...` directly. Must be a top-level dep so
    // Rollup can resolve it during `vite build`.
    'pako',
    // Type-only package used in ReportPdfDocument.tsx; ships as transitive
    // dep of @react-pdf/renderer.
    '@react-pdf/types',
  ],
  // Disable Capacitor plugin detection (config file format not supported)
  capacitor: false,
};

export default config;
