import { useI18n } from '../hooks/useI18n.js';

/**
 * Inactivity warning: countdown then session reset to welcome (Figma 4287:26247).
 */
export function IdleSessionModal({ open, secondsLeft, onContinue }) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(30,30,30,0.7)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-modal-title"
    >
      <div className="flex w-full max-w-[516px] flex-col gap-10 rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-4 text-center text-ink">
          <h2 id="idle-modal-title" className="text-[28px] font-bold leading-9">
            {t('idleModal.title')}
          </h2>
          <p className="text-[20px] font-medium leading-7">{t('idleModal.body')}</p>
        </div>
        <p className="text-center text-[min(144px,22vw)] font-bold leading-none tracking-wide text-ink">
          {secondsLeft}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-14 w-full rounded-[90px] bg-brand-green py-5 text-[18px] font-semibold text-white shadow-md transition hover:opacity-95"
        >
          {t('idleModal.continue')}
        </button>
      </div>
    </div>
  );
}
