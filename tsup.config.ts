import { copyFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
  banner: { js: '"use client";' },
  onSuccess: async () => {
    copyFileSync('src/index.css', 'dist/index.css')
  }
})
