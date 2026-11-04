import { EventEmitter } from 'node:events';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildReceipt } from './escpos/commands.js';

/**
 * ESC/POS receipt printer reached through a Windows print queue.
 *
 * Alternative to ThermalReceiptPrinter for installs where the printer keeps the
 * stock Windows `usbprint` driver (no Zadig/WinUSB swap). The queue should use
 * the "Generic / Text Only" driver; jobs are submitted with the RAW datatype so
 * the ESC/POS bytes reach the printer untouched.
 *
 * Talks to winspool.drv via a short PowerShell script, so no extra native
 * module has to be rebuilt for Electron. Trade-off: the spooler is write-only,
 * so paper-out / cover-open status cannot be read back, and a job sent while
 * the printer is unplugged waits in the queue instead of failing.
 */
const RAW_PRINT_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class KioskRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDatatype; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern int StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool WritePrinter(IntPtr h, byte[] buf, int len, out int written);

  public static int Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Win32Exception();
    try {
      if (data == null) return 0;
      var di = new DOCINFO { pDocName = "Kiosk receipt", pDatatype = "RAW" };
      if (StartDocPrinter(h, 1, di) == 0) throw new Win32Exception();
      try {
        StartPagePrinter(h);
        int written;
        if (!WritePrinter(h, data, data.Length, out written)) throw new Win32Exception();
        if (written != data.Length) throw new Exception("short write: " + written + "/" + data.Length);
        EndPagePrinter(h);
        return written;
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@
try {
  $data = $null
  if ($env:KIOSK_RAW_FILE) { $data = [IO.File]::ReadAllBytes($env:KIOSK_RAW_FILE) }
  [KioskRawPrinter]::Send($env:KIOSK_PRINTER_NAME, $data) | Out-Null
} catch {
  # Plain-text error on stderr (PowerShell would otherwise emit CLIXML).
  $e = $_.Exception
  while ($e.InnerException) { $e = $e.InnerException }
  [Console]::Error.WriteLine($e.Message)
  exit 1
}
`;

// PowerShell -EncodedCommand takes base64 of UTF-16LE text; avoids quoting issues.
const ENCODED_SCRIPT = Buffer.from(RAW_PRINT_SCRIPT, 'utf16le').toString('base64');

function runRawPrint(printerName, rawFile, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', ENCODED_SCRIPT],
      {
        windowsHide: true,
        timeout: timeoutMs,
        // Printer name and file path go in via env, never into the script text.
        env: { ...process.env, KIOSK_PRINTER_NAME: printerName, KIOSK_RAW_FILE: rawFile ?? '' },
      },
      (err, _stdout, stderr) => {
        if (err) {
          // Skip any CLIXML noise PowerShell may still put on stderr.
          const detail =
            String(stderr || '')
              .split(/\r?\n/)
              .map((l) => l.trim())
              .find((l) => l && !l.startsWith('#<') && !l.startsWith('<')) || err.message;
          reject(new Error(`Windows print queue '${printerName}': ${detail}`));
        } else {
          resolve();
        }
      },
    );
  });
}

export class WindowsSpoolerReceiptPrinter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.printerName = config.printerName;
    this.charsPerLine = config.charsPerLine ?? 48;
    this.timeoutMs = config.spoolTimeoutMs ?? 15000;
    this._ready = false;
  }

  async initialize() {
    if (this.config.enabled === false) {
      throw new Error('Receipt printer is disabled in config');
    }
    if (process.platform !== 'win32') {
      throw new Error("printer.interface 'windows' is only supported on Windows");
    }
    if (!this.printerName) {
      throw new Error("printer.printerName is required when printer.interface is 'windows'");
    }
    // Opening the queue confirms it exists without printing anything.
    await runRawPrint(this.printerName, null, this.timeoutMs);
    this._ready = true;
    this.emit('ready', { printerName: this.printerName });
    return { ok: true };
  }

  /**
   * @param {import('./escpos/commands.js').buildReceipt extends (d: infer D, ...a: any) => any ? D : never} data
   */
  async print(data) {
    if (!this._ready) {
      throw new Error('Receipt printer is not connected');
    }
    const bytes = buildReceipt(data, {
      charsPerLine: this.charsPerLine,
      header: this.config.header,
    });
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiosk-receipt-'));
    const file = path.join(dir, 'receipt.bin');
    try {
      await fs.writeFile(file, bytes);
      await runRawPrint(this.printerName, file, this.timeoutMs);
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    this.emit('printed', { orderNumber: data.orderNumber });
    return { ok: true };
  }

  async close() {
    this._ready = false;
  }
}
