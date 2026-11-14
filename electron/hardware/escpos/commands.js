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

/** Characters PC866 lacks, folded to the closest printable one. */
const CHAR_FOLD = {
  'ʻ': "'", 'ʼ': "'", '‘': "'", '’': "'", '`': "'", // uz o'/g' apostrophes
  '“': '"', '”': '"', '«': '"', '»': '"',
  '–': '-', '—': '-', '−': '-',
  ' ': ' ', ' ': ' ', ' ': ' ',
  '№': 'N',
  // Uzbek Cyrillic letters outside PC866
  'Қ': 'К', 'қ': 'к', // Қ қ -> К к
  'Ғ': 'Г', 'ғ': 'г', // Ғ ғ -> Г г
  'Ҳ': 'Х', 'ҳ': 'х', // Ҳ ҳ -> Х х
};

/** Encode one character for the PC866 code page selected in buildReceipt. */
function pc866Byte(ch) {
  const c = ch.codePointAt(0);
  if (c < 0x80) return c;
  if (c >= 0x0410 && c <= 0x043f) return c - 0x0410 + 0x80; // А-Я а-п
  if (c >= 0x0440 && c <= 0x044f) return c - 0x0440 + 0xe0; // р-я
  if (c === 0x0401) return 0xf0; // Ё
  if (c === 0x0451) return 0xf1; // ё
  if (c === 0x040e) return 0xf6; // Ў
  if (c === 0x045e) return 0xf7; // ў
  return 0x3f; // '?'
}

/**
 * Normalise text to one-byte-per-column PC866 (Latin + Russian/Uzbek
 * Cyrillic). Returned as a string so widths can be measured with .length.
 */
function normalize(text) {
  return Array.from(String(text ?? ''), (ch) => CHAR_FOLD[ch] ?? ch).join('');
}

function toLine(text) {
  return Buffer.from(Array.from(normalize(text), pc866Byte));
}

/** Word-wrap `text` to lines of at most `width` columns (hard-splits long words). */
function wrap(text, width) {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (let w of words) {
    while (w.length > width) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!w) continue;
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Left/right justified line padded to `width` columns. */
function lr(left, right, width) {
  const l = normalize(left);
  const r = normalize(right);
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
 * @param {Array<{name:string, qty:number, price:number, lineTotal?:number, details?:string[]}>} data.items
 *   `details` are sub-lines printed indented under the item (pizza size/crust/
 *   bort/toppings, combo components).
 * @param {number} data.total  integer so'm
 * @param {string} [data.transactionId]
 * @param {string} [data.timestamp] ISO string
 * @param {string} [data.paymentMethod]
 * @param {boolean} [data.testMode]  prints a "not paid" banner (test payment type)
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

  const testBanner = () => {
    push(CMD.ALIGN_CENTER);
    push(CMD.BOLD_ON);
    text('*** TEST - NOT PAID ***');
    nl();
    push(CMD.BOLD_OFF);
    push(CMD.ALIGN_LEFT);
  };
  if (data.testMode) testBanner();

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
  const DETAIL_INDENT = '   ';
  for (const it of data.items || []) {
    const qty = it.qty || 1;
    const line = it.lineTotal ?? (Number(it.price) || 0) * qty;
    push(CMD.BOLD_ON);
    for (const l of wrap(`${qty} x ${it.name}`, width)) {
      text(l);
      nl();
    }
    push(CMD.BOLD_OFF);
    for (const d of Array.isArray(it.details) ? it.details : []) {
      for (const l of wrap(d, width - DETAIL_INDENT.length)) {
        text(DETAIL_INDENT + l);
        nl();
      }
    }
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

  if (data.testMode) testBanner();

  push(CMD.ALIGN_CENTER);
  text('Rahmat! Yana keling :)');
  nl();

  // Feed and cut.
  push([LF, LF, LF, LF]);
  push(CMD.CUT);

  return Buffer.concat(chunks);
}
