import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Dev server is configured for the sandbox preview proxy:
// bind on all interfaces and accept the proxied host.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    reportCompressedSize: false,
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
