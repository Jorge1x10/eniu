import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    restoreMocks: true,
    // Las pruebas no deben depender de un `.env` local: varios módulos leen
    // la URL de la API al importarse.
    env: {
      VITE_API_URL: 'http://api.eniu.test/api',
    },
  },
})
