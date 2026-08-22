import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Production optimizations
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor splitting for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'lexical-vendor': [
            'lexical',
            '@lexical/react',
            '@lexical/rich-text',
            '@lexical/list',
            '@lexical/link',
            '@lexical/selection',
            '@lexical/utils',
          ],
          'yjs-vendor': ['yjs', 'y-websocket'],
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (disable if not needed)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Asset optimization
    assetsInlineLimit: 4096, // inline assets smaller than 4kb
  },
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lexical',
      '@lexical/react',
      'yjs',
      'y-websocket',
    ],
  },
})

