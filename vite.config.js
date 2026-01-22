import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ══════════════════════════════════════════════════════════════
// 🔧 DEBUG TOGGLE - Ändere nur diese Zeile!
// ══════════════════════════════════════════════════════════════
const DEBUG_MODE = true;  // true = Logs behalten, false = Logs entfernen (Release)
// ══════════════════════════════════════════════════════════════

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],
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
            
            // 1. PDF-Bibliotheken in einen eigenen Chunk (werden jetzt lazy geladen)
            if (id.includes('html2pdf') || id.includes('html2canvas') || id.includes('jspdf')) {
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