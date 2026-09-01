import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    base: env.VITE_BASE_PATH || '/',
    // ✅ Force Vite à pré-packager ces dépendances
    optimizeDeps: {
      include: [
        'sql.js',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        '@supabase/supabase-js',
        'html5-qrcode',
        'pinia',
        'vue',
        'vue-router'
      ],
      // Évite la pré-optimisation qui peut casser le WASM
      exclude: []
    },
    build: {
      outDir: 'dist',
      // ✅ sql.js charge un .wasm, on doit le traiter comme asset
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Le WASM doit rester un fichier séparé pour sql.js
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.wasm')) {
              return 'assets/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    },
    
    // ✅ Sert correctement le .wasm en dev
    server: {
      fs: {
        allow: ['..']
      },
      allowedHosts: 'all'
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.js'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html']
      }
    }
  }
})


// Le base path est lu depuis .env à la construction.
// Créez un fichier .env.production avec :
//   VITE_BASE_PATH=/nom-du-repo/
