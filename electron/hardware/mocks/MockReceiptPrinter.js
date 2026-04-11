/**
 * Logs receipt text to the main process console (macOS dev preview).
 */
export class MockReceiptPrinter {
  async initialize() {
    return { ok: true };
  }

  /**
   * @param {{ orderNumber: number; items: Array<{ name: string; qty: number; price: number; lineTotal?: number }>; total: number; transactionId?: string; timestamp?: string }} data
   */
  async print(data) {
    const body = (data.items || []).map((i) => {
      const line = i.lineTotal ?? i.price * (i.qty || 1);
      return `${i.qty}x ${i.name}`.padEnd(26) + line.toFixed(2);
    });
    const block = [
      '========== BELLISSIMO ==========',
      `Order #${data.orderNumber}`,
      '--------------------------------',
      ...body,
      '--------------------------------',
      `TOTAL: ${Number(data.total).toFixed(2)}`,
      `Txn: ${data.transactionId || 'n/a'}`,
      `Time: ${data.timestamp || new Date().toISOString()}`,
      '================================',
    ].join('\n');
    console.log('[kiosk][receipt preview]\n' + block);
    return { ok: true };
  }
}
