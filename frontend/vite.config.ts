import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Optimize build performance
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Advanced code splitting
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('rxjs')) {
              return 'rxjs-vendor';
            }
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            // Other vendors
            return 'vendor';
          }
          // Screen-based chunks
          if (id.includes('/components/screens/')) {
            const match = id.match(/screens\/(\w+)/);
            if (match) {
              return `screen-${match[1].toLowerCase()}`;
            }
          }
        },
        // Optimize chunk naming
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Improve build performance
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'rxjs',
      '@tanstack/react-virtual',
    ],
    exclude: ['@wailsapp/runtime'],
  },
  server: {
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },
});
