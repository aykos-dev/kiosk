/**
 * ESC/POS command builder for the XPrinter (USB thermal, 80mm).
 *
 * Pure and dependency-free: it turns an order into a Buffer of ESC/POS bytes.
 * The transport (USB write) lives in ThermalReceiptPrinter.js so this stays
 * trivially testable and printer-agnostic.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export const CMD = {
  INIT: [ESC, 0x40], // ESC @  - reset printer
  ALIGN_LEFT: [ESC, 0x61, 0],
  ALIGN_CENTER: [ESC, 0x61, 1],
  ALIGN_RIGHT: [ESC, 0x61, 2],
  BOLD_ON: [ESC, 0x45, 1],
  BOLD_OFF: [ESC, 0x45, 0],
  DOUBLE_ON: [GS, 0x21, 0x11], // double width + height
  DOUBLE_OFF: [GS, 0x21, 0x00],
  FEED: [LF],
  CUT: [GS, 0x56, 0x42, 0x00], // GS V - partial cut with feed
  // ESC t n - select character code table. 46 = WPC1258? Use PC866 (Cyrillic) = 17.
  CODEPAGE_PC866: [ESC, 0x74, 17],
};

/**
 * Bellissimo uses Latin-script transliteration in receipts already, but so'm
 * amounts and Cyrillic can appear; we normalise to ASCII to stay safe on any
 * codepage the XPrinter defaults to. Callers pass already-localised strings.
 */
function toLine(text) {
  return Buffer.from(String(text ?? ''), 'latin1');
}

/** Left/right justified line padded to `width` columns. */
function lr(left, right, width) {
  const l = String(left ?? '');
  const r = String(right ?? '');
  const space = Math.max(1, width - l.length - r.length);
  if (l.length + r.length >= width) {
    return `${l.slice(0, Math.max(0, width - r.length - 1))} ${r}`;
  }
  return l + ' '.repeat(space) + r;
}

function money(n) {
  const v = Math.round(Number(n) || 0);
  // Group thousands with spaces (UZS convention): 1 234 567
  return v.toLocaleString('ru-RU').replace(/ /g, ' ');
}

/**
 * Build the full receipt byte buffer.
 * @param {object} data
 * @param {number|string} data.orderNumber
 * @param {Array<{name:string, qty:number, price:number, lineTotal?:number}>} data.items
 * @param {number} data.total  integer so'm
 * @param {string} [data.transactionId]
 * @param {string} [data.timestamp] ISO string
 * @param {string} [data.paymentMethod]
 * @param {object} [opts]
 * @param {number} [opts.charsPerLine=48]
 * @param {string} [opts.header='BELLISSIMO']
 * @returns {Buffer}
 */
export function buildReceipt(data, opts = {}) {
  const width = opts.charsPerLine ?? 48;
  const header = opts.header ?? 'BELLISSIMO';
  const chunks = [];
  const push = (bytes) => chunks.push(Buffer.from(bytes));
  const text = (s) => chunks.push(toLine(s));
  const nl = () => chunks.push(Buffer.from([LF]));
  const rule = () => {
    text('-'.repeat(width));
    nl();
  };

  push(CMD.INIT);
  push(CMD.CODEPAGE_PC866);

  // Header
  push(CMD.ALIGN_CENTER);
  push(CMD.DOUBLE_ON);
  push(CMD.BOLD_ON);
  text(header);
  nl();
  push(CMD.DOUBLE_OFF);
  push(CMD.BOLD_OFF);
  nl();

  push(CMD.ALIGN_LEFT);
  push(CMD.BOLD_ON);
  text(lr('ORDER', `#${data.orderNumber}`, width));
  nl();
  push(CMD.BOLD_OFF);

  const ts = data.timestamp ? String(data.timestamp).replace('T', ' ').slice(0, 19) : '';
  if (ts) {
    text(ts);
    nl();
  }
  rule();

  // Items
  for (const it of data.items || []) {
    const qty = it.qty || 1;
    const line = it.lineTotal ?? (Number(it.price) || 0) * qty;
    text(`${qty} x ${it.name}`);
    nl();
    push(CMD.ALIGN_RIGHT);
    text(money(line));
    nl();
    push(CMD.ALIGN_LEFT);
  }
  rule();

  // Total
  push(CMD.BOLD_ON);
  push(CMD.DOUBLE_ON);
  text(lr('TOTAL', money(data.total), Math.floor(width / 2)));
  nl();
  push(CMD.DOUBLE_OFF);
  push(CMD.BOLD_OFF);

  if (data.paymentMethod) {
    text(lr('Payment', String(data.paymentMethod).toUpperCase(), width));
    nl();
  }
  if (data.transactionId) {
    text(lr('Txn', String(data.transactionId), width));
    nl();
  }
  rule();

  push(CMD.ALIGN_CENTER);
  text('Rahmat! Yana keling :)');
  nl();

  // Feed and cut.
  push([LF, LF, LF, LF]);
  push(CMD.CUT);

  return Buffer.concat(chunks);
}
