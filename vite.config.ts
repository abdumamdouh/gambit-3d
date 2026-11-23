/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Unit tests only; e2e/ belongs to Playwright.
  test: { include: ['src/**/*.test.ts'] },
})
