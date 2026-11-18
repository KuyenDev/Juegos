import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyPWAAssetsPlugin() {
  return {
    name: 'copy-pwa-assets',
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist');
      for (const file of ['manifest.webmanifest', 'service-worker.js']) {
        const src = path.resolve(process.cwd(), file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(outDir, file));
        }
      }
      const assetsSrc = path.resolve(process.cwd(), 'assets');
      const assetsDest = path.join(outDir, 'assets');
      if (fs.existsSync(assetsSrc)) {
        fs.cpSync(assetsSrc, assetsDest, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 4173,
    host: true
  },
  build: {
    outDir: 'dist',
    target: 'es2022'
  },
  plugins: [copyPWAAssetsPlugin()]
});
