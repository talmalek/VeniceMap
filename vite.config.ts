import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function encryptApiKey(plaintext: string, password: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 600_000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, encrypted, authTag]).toString('base64');
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const mapsApiKey =
    env.VITE_GOOGLE_MAPS_API_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  const unlockPassword =
    env.UNLOCK_PASSWORD ||
    env.VITE_UNLOCK_PASSWORD ||
    process.env.UNLOCK_PASSWORD ||
    process.env.VITE_UNLOCK_PASSWORD ||
    '';

  const preEncryptedKey =
    env.VITE_ENCRYPTED_MAPS_KEY ||
    process.env.VITE_ENCRYPTED_MAPS_KEY ||
    '';

  let encryptedMapsKey = preEncryptedKey;
  if (!encryptedMapsKey && mapsApiKey && unlockPassword) {
    encryptedMapsKey = encryptApiKey(mapsApiKey, unlockPassword);
  }

  // Never expose raw API key in production builds; only expose encrypted payload.
  const publicApiKey =
    mode === 'development' && !unlockPassword ? mapsApiKey : '';

  return {
    base: '/VeniceMap/',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(publicApiKey),
      'import.meta.env.VITE_ENCRYPTED_MAPS_KEY': JSON.stringify(encryptedMapsKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@vis.gl/react-google-maps')) return 'maps-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            if (id.includes('exifr')) return 'exif-vendor';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 4174,
      host: '127.0.0.1',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 4174,
      host: '127.0.0.1',
    },
  };
});
