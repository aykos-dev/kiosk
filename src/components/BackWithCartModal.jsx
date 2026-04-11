import { useI18n } from '../hooks/useI18n.js';

/**
 * Confirm leaving menu when cart has items (Figma 4287:26198).
 */
export function BackWithCartModal({ open, onCancel, onConfirm }) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(30,30,30,0.7)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="back-cart-modal-title"
    >
      <div className="flex w-full max-w-[516px] flex-col gap-10 rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-4 text-center text-ink">
          <h2 id="back-cart-modal-title" className="text-[28px] font-bold leading-9">
            {t('backCartModal.title')}
          </h2>
          <p className="text-[20px] font-medium leading-7">{t('backCartModal.body')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 w-full rounded-[90px] bg-black/[0.05] py-5 text-[18px] font-semibold text-ink transition hover:bg-black/10"
          >
            {t('backCartModal.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-14 w-full rounded-[90px] bg-brand-green py-5 text-[18px] font-semibold text-white shadow-md transition hover:opacity-95"
          >
            {t('backCartModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
