import { useCallback, useEffect, useId, useState } from 'react';
import { useI18n } from '../hooks/useI18n.js';
import { KIOSK_SETTINGS_PASSWORD } from '../lib/kioskSettingsAuth.js';

/**
 * Must succeed before {@link KioskSettingsModal} is shown.
 */
export function KioskPasswordModal({ open, onClose, onSuccess }) {
  const { t } = useI18n();
  const formId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setError(false);
  }, [open]);

  const submit = useCallback(() => {
    if (value === KIOSK_SETTINGS_PASSWORD) {
      onSuccess();
      return;
    }
    setError(true);
  }, [value, onSuccess]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 animate-kiosk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <div className="animate-kiosk-card w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id={`${formId}-title`} className="font-product text-2xl font-bold text-ink">
          {t('settings.passwordTitle')}
        </h2>
        <p className="mt-2 font-inter text-sm text-ink-muted">{t('settings.passwordHint')}</p>

        <div className="mt-6">
          <label htmlFor={`${formId}-pw`} className="sr-only">
            {t('settings.passwordPlaceholder')}
          </label>
          <input
            id={`${formId}-pw`}
            type="password"
            name="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder={t('settings.passwordPlaceholder')}
            className="w-full rounded-2xl border border-black/10 bg-surface px-4 py-3 font-inter text-[16px] text-ink outline-none ring-brand-green/30 transition focus:ring-2"
          />
          {error && (
            <p className="mt-2 font-inter text-sm text-brand-orange" role="alert">
              {t('settings.passwordWrong')}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submit}
            className="min-h-[48px] flex-1 rounded-full bg-brand-green px-6 py-3 font-inter text-[16px] font-semibold text-white transition hover:bg-[#033a20] active:scale-[0.99]"
          >
            {t('settings.passwordSubmit')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-full bg-surface px-6 py-3 font-inter text-[16px] font-semibold text-ink transition hover:bg-neutral-200/90"
          >
            {t('settings.passwordCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
