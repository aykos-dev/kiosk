import { useEffect, useState } from 'react';
import { useI18n } from '../hooks/useI18n.js';

export function AdminPanel({ open, onClose }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [syncInfo, setSyncInfo] = useState(null);

  useEffect(() => {
    if (!open || !window.kiosk) return undefined;
    window.kiosk.listOrders().then(setOrders).catch(() => setOrders([]));
    const unsub = window.kiosk.onSyncStatus((s) => setSyncInfo(s));
    return () => unsub?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-neutral-900">{t('admin.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-100 px-4 py-2 font-semibold text-neutral-800"
          >
            {t('admin.close')}
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-6" style={{ maxHeight: '70vh' }}>
          <section className="rounded-2xl bg-orange-50 p-4">
            <h3 className="mb-2 font-semibold text-orange-900">{t('admin.sync')}</h3>
            <pre className="whitespace-pre-wrap text-sm text-neutral-700">
              {JSON.stringify(syncInfo, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white"
                onClick={() => window.kiosk?.triggerSync()}
              >
                {t('admin.syncNow')}
              </button>
              <button
                type="button"
                className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white"
                onClick={() => window.kiosk?.testPrinter()}
              >
                {t('admin.testPrinter')}
              </button>
              <button
                type="button"
                className="rounded-xl bg-neutral-800 px-4 py-2 font-semibold text-white"
                onClick={() => window.kiosk?.testPayment()}
              >
                {t('admin.testPayment')}
              </button>
            </div>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-neutral-900">{t('admin.orders')}</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-3 py-2">{t('admin.thNumber')}</th>
                    <th className="px-3 py-2">{t('admin.thTotal')}</th>
                    <th className="px-3 py-2">{t('admin.thSynced')}</th>
                    <th className="px-3 py-2">{t('admin.thCreated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-3 py-2 font-semibold">{o.order_number}</td>
                      <td className="px-3 py-2">{Number(o.total).toFixed(2)}</td>
                      <td className="px-3 py-2">{o.synced ? t('admin.yes') : t('admin.no')}</td>
                      <td className="px-3 py-2 text-xs">{o.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
