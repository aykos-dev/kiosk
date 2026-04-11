# Bellissimo Kiosk

Offline-first food kiosk built with **Electron**, **React 18+**, **SQLite (better-sqlite3)**, **Tailwind CSS**, and **Zustand**. Payment and printing use hardware abstraction layers with **mock implementations on macOS** for development; Windows targets can swap in serial payment and ESC/POS printing.

## Prerequisites

- Node.js 20+ and npm
- macOS for current development; Windows 10/11 for production kiosks
- Xcode Command Line Tools (macOS) for native module builds

## Install

```bash
npm install
```

`postinstall` runs `electron-rebuild` for `better-sqlite3` against the bundled Electron version.

## Run (development)

```bash
npm start
# or
npm run dev
```

- Menu and cart run in the renderer; checkout, SQLite, sync, and hardware run in the main process.
- On macOS, payment and receipt printing use mocks (console receipt preview, simulated approval after ~2–3s).
- SQLite database file: OS user data directory (`kiosk.db`).

## Configuration

Default settings are merged from (in order):

1. `config.json` next to the app / project (see repository root for a sample)
2. `%APPDATA%`-style user data on Windows / `userData` on macOS: `config.json` inside the app’s user data folder

Important fields:

- `mode`: `development` | `production`
- `kiosk.fullscreen`, `kiosk.inactivityTimeout`
- `hardware.paymentTerminal.useMock`, `hardware.printer.useMock`, serial/USB identifiers for production
- `api.baseUrl`, `api.timeout`, `api.retryAttempts`

Edit the root `config.json` for local dev (e.g. `kiosk.fullscreen: false`).

## Menu data

Sample catalog: `assets/menu-items/menu.json` (imported by the UI). Product images are loaded from `public/menu-items/` (e.g. `placeholder.svg`).

## Building installers

```bash
npm run make
```

Platform-specific:

```bash
npm run build:mac
npm run build:win
```

Building **Windows artifacts on macOS** is supported by Electron Forge (Squirrel/zip targets). You need a Windows build environment or CI for code signing and full MSI/Squirrel release flows as required by your org.

Output locations follow Electron Forge defaults (e.g. `out/`).

## Architecture (summary)

- `electron/main.js` — windows, IPC, DB path, payment/receipt wiring, sync manager
- `electron/preload.js` — exposes `window.kiosk` to the renderer
- `electron/hardware/` — payment and printer factories + mocks
- `src/services/database.js` — SQLite schema, orders, sync queue
- `src/services/api.js` — Axios client with retries
- `src/services/syncManager.js` — periodic sync when online, retry cap in DB
- `src/` — React UI (menu, cart, payment overlay, order number, admin)

## Admin panel

Tap the **invisible top-left corner** five times within two seconds to open the admin panel (sync status, local orders, test print, test payment, manual sync).

## Hardware (production)

- **Payment terminal:** configure `hardware.paymentTerminal` (COM port on Windows, baud rate). Implement the vendor protocol in `electron/hardware/WindowsSerialPaymentTerminal.js` (currently throws until completed).
- **Thermal printer:** configure USB identifiers; implement ESC/POS in `electron/hardware/ThermalReceiptPrinter.js` (placeholder until completed).

## Security notes

- Card data is not stored; only totals and transaction IDs from your terminal integration should be persisted.
- Use HTTPS for `api.baseUrl` in production; add request signing / auth headers in `api.js` as your backend requires.
- Sanitize any free-text fields before storing or sending to APIs.

## Troubleshooting

- **`better-sqlite3` load errors:** Run `npx electron-rebuild -f -w better-sqlite3` after changing Electron version.
- **Blank window:** Check the Vite dev server URL in the terminal; firewall blocking localhost can break dev.
- **Sync always failing:** Backend must expose `POST /orders` and ideally `GET /health` (health check is best-effort). Orders remain queued in SQLite until sync succeeds or retries are exhausted.

## Manual test checklist (short)

1. Add items, pay with mock → order number screen → receipt in main process log.
2. Confirm `kiosk.db` contains the order and `sync_queue` row until API succeeds.
3. Toggle network (or set API URL to invalid) and confirm offline behavior; restore and confirm sync when possible.
4. Open admin (corner taps), run test print / test payment.

## License

MIT
