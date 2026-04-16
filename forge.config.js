const path = require('path');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const iconBase = path.join(__dirname, 'assets/images/bellissimo-icon');
const setupIco = path.join(__dirname, 'assets/images/bellissimo-icon.ico');
const installGif = path.join(__dirname, 'assets/images/install-loading.gif');

/**
 * @electron-forge/plugin-vite normally ignores everything except `/.vite`, which strips
 * `node_modules`. Main-process externals (better-sqlite3, electron-squirrel-startup) must
 * ship in the app or startup throws before any window appears.
 */
function packagerIgnore(file) {
  if (!file) return false;
  // Packager passes paths like "node_modules/foo" (no leading slash); normalize for prefix checks
  const f = `/${String(file).replace(/\\/g, '/').replace(/^\/+/, '')}`;
  // Must not ignore the node_modules directory itself, or fs-extra skips the whole tree (no native deps copied)
  if (f === '/node_modules' || f === '/node_modules/') return false;
  const keep = [
    '/.vite',
    '/assets/images/bellissimo-icon',
    '/node_modules/better-sqlite3',
    '/node_modules/bindings',
    '/node_modules/file-uri-to-path',
    '/node_modules/electron-squirrel-startup',
    '/node_modules/debug',
    '/node_modules/ms',
  ];
  for (const prefix of keep) {
    if (f === prefix || f.startsWith(`${prefix}/`)) return false;
  }
  return true;
}

module.exports = {
  packagerConfig: {
    asar: true,
    // Galactus pruning drops deps not seen in static analysis; Vite externals (better-sqlite3, etc.) are missed.
    prune: false,
    // Windows .exe / macOS .icns / Linux — pass path without extension where supported
    icon: iconBase,
    ignore: packagerIgnore,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: setupIco,
        loadingGif: installGif,
        // Start menu / shortcut display name (search "Bellissimo")
        title: 'Bellissimo Kiosk',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    // Unpack *.node binaries (e.g. better-sqlite3) — required when asar is enabled
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'electron/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'electron/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
