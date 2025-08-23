import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Tell Vite to not bundle 'some-library'
      external: ['some-library'],
    },
  },
});
