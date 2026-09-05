import { defineConfig, build } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Helper plugin to build content script as a self-contained IIFE classic script
function contentScriptPlugin() {
  return {
    name: 'build-content-script',
    async writeBundle() {
      await build({
        configFile: false,
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          rollupOptions: {
            input: {
              content: resolve(__dirname, 'src/content/index.ts'),
            },
            output: {
              format: 'iife',
              entryFileNames: 'content/content.js',
              inlineDynamicImports: true,
            },
          },
        },
      });
    },
  };
}

// Helper plugin to copy manifest.json into dist
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      if (!existsSync('dist')) {
        mkdirSync('dist', { recursive: true });
      }
      if (existsSync('manifest.json')) {
        copyFileSync('manifest.json', 'dist/manifest.json');
      }
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js';
          }
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  plugins: [contentScriptPlugin(), copyManifestPlugin()],
});

