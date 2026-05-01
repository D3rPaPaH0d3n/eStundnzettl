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
            //    statisch und zieht den Chunk damit auch beim Start ein.
            //    Trennung dient hauptsaechlich der Cache-Stabilitaet.
            if (id.includes('@react-pdf') || id.includes('react-pdf') || id.includes('@fontsource')) {
              return 'pdf-libs';
            }
            
            // 2. Animations-Bibliothek separat
            if (id.includes('framer-motion')) {
              return 'animation';
            }

            // 3. Icons separat (optional, da lucide recht groß sein kann)
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