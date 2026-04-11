import { defineConfig } from 'vite';

// Native addons must load from node_modules at runtime, not be bundled.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'electron-squirrel-startup', 'better-sqlite3'],
    },
  },
});
