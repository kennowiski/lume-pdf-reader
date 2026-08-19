import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Separa as libs pesadas em chunks próprios (carregados sob demanda /
        // em paralelo) em vez de um único bundle de ~1MB. react-pdf/pdfjs é
        // necessário para abrir qualquer PDF, mas pdf-lib só é usado dentro
        // das Ferramentas de PDF (já lazy-loaded via React.lazy em App.tsx).
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'pdf-viewer-vendor';
            if (id.includes('pdf-lib')) return 'pdf-tools-vendor';
            if (id.includes('lucide-react')) return 'icons';
          }
        },
      },
    },
  },
})