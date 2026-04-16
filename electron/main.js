/**
 * Squirrel.Windows must run before any other app code (see electron-squirrel-startup).
 * Load the real app only when not handling --squirrel-* install/update hooks.
 */
import { app } from 'electron';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let squirrelHandled = false;
if (process.platform === 'win32') {
  try {
    squirrelHandled = require('electron-squirrel-startup');
  } catch (err) {
    console.warn('[electron-squirrel-startup]', err?.message ?? err);
  }
}

if (squirrelHandled) {
  app.quit();
} else {
  void import('./main-app.js');
}
