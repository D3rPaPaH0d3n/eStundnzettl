import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import pkg from './package.json' with { type: 'json' }

// ══════════════════════════════════════════════════════════════
// 🔧 DEBUG TOGGLE - Ändere nur diese Zeile!
// ══════════════════════════════════════════════════════════════
const DEBUG_MODE = false;  // true = Logs behalten, false = Logs entfernen (Release)
// ══════════════════════════════════════════════════════════════

const ANALYZE = process.env.ANALYZE === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  // Version aus package.json zur Build-Zeit injizieren (Single Point of Truth)
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
    '__SENTRY_DSN__': JSON.stringify(process.env.SENTRY_DSN || ''),
  },
  plugins: [
    react(),
    tailwindcss(),
    ANALYZE && visualizer({
      open: false,
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  build: {
    // PRODUCTION: Terser für Minifizierung + Console-Entfernung
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: !DEBUG_MODE,   // Entfernt ALLE console.* Statements (wenn DEBUG_MODE = false)
        drop_debugger: true,         // Entfernt debugger Statements
        pure_funcs: DEBUG_MODE ? [] : [
          'console.log', 
          'console.info', 
          'console.debug', 
          'console.trace'
        ]
      },
      format: {
        comments: false  // Entfernt auch Kommentare für kleinere Bundle-Größe
      }
    },
    
    // Erhöht das Limit für die Warnung (optional, beruhigt aber die Konsole)
    chunkSizeWarningLimit: 1000, 
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Prüft, ob das Modul aus node_modules kommt
          if (id.includes('node_modules')) {
            
            // 1. PDF-Bibliotheken in einen eigenen Chunk.
            //    Hinweis: PrintReport ist via React.lazy ausgelagert,
            //    aber useAutoPdfArchive importiert renderMonthlyReportPdfBlob
            //    statisch und zieht @react-pdf damit beim Start ein.
            //    pdfjs-dist (fuer die Canvas-Vorschau) ist nur in
            //    PrintReport gebraucht und damit lazy.
            if (
              id.includes('@react-pdf') ||
              id.includes('react-pdf') ||
              id.includes('@fontsource') ||
              id.includes('fontkit') ||
              id.includes('yoga-layout') ||
              id.includes('hyphen') ||
              id.includes('linebreak') ||
              id.includes('bidi-js') ||
              id.includes('unicode-properties') ||
              id.includes('unicode-trie') ||
              id.includes('restructure') ||
              id.includes('brotli') ||
              id.includes('jay-peg') ||
              id.includes('png-js') ||
              id.includes('browserify-zlib') ||
              id.includes('/pako/') ||
              id.includes('pako') ||
              id.includes('fflate')
            ) {
              return 'pdf-libs';
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            
            // 2. Sentry separat, damit das lazy geladene Monitoring nicht
            //    im allgemeinen Start-vendor landet.
            if (id.includes('@sentry')) {
              return 'sentry';
            }

            // 3. Animations-Bibliothek separat
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'animation';
            }

            // 4. Icons separat (optional, da lucide recht groß sein kann)
            if (id.includes('lucide-react')) {
              return 'icons';
            }

            // 4. Alles andere kommt in den allgemeinen "vendor"-Chunk
            return 'vendor';
          }
        }
      }
    }
  }
})