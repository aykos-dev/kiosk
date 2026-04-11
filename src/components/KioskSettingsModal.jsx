import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../hooks/useI18n.js';
import { useKioskSettingsStore } from '../store/kioskSettingsStore.js';
import {
  DEFAULT_KIOSK_CITY_ID,
  DEFAULT_KIOSK_ORGANIZATION_ID,
} from '../lib/organizationConstants.js';
import { queryKeys } from '../api/queryKeys.js';

/**
 * Staff-only: configure city / organization for payment types and orgs API.
 */
export function KioskSettingsModal({ open, onClose }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const storedCity = useKioskSettingsStore((s) => s.cityId);
  const storedOrg = useKioskSettingsStore((s) => s.organizationId);
  const setKioskLocation = useKioskSettingsStore((s) => s.setKioskLocation);
  const resetToDefaults = useKioskSettingsStore((s) => s.resetToDefaults);

  const [cityDraft, setCityDraft] = useState(storedCity);
  const [orgDraft, setOrgDraft] = useState(storedOrg);

  useEffect(() => {
    if (!open) return;
    setCityDraft(storedCity);
    setOrgDraft(storedOrg);
  }, [open, storedCity, storedOrg]);

  if (!open) return null;

  const handleSave = () => {
    setKioskLocation(cityDraft, orgDraft);
    queryClient.invalidateQueries({ queryKey: ['catalog', 'organizations'] });
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    setCityDraft(DEFAULT_KIOSK_CITY_ID);
    setOrgDraft(DEFAULT_KIOSK_ORGANIZATION_ID);
    queryClient.invalidateQueries({ queryKey: ['catalog', 'organizations'] });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 animate-kiosk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-settings-title"
    >
      <div className="animate-kiosk-card w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="kiosk-settings-title" className="font-product text-2xl font-bold text-ink">
          {t('settings.title')}
        </h2>
        <p className="mt-2 font-inter text-sm text-ink-muted">{t('settings.hint')}</p>

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-inter text-sm font-semibold text-ink">{t('settings.cityId')}</span>
            <input
              type="text"
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-2xl border border-black/10 bg-surface px-4 py-3 font-mono text-[15px] text-ink outline-none ring-brand-green/30 transition focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-inter text-sm font-semibold text-ink">{t('settings.organizationId')}</span>
            <input
              type="text"
              value={orgDraft}
              onChange={(e) => setOrgDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-2xl border border-black/10 bg-surface px-4 py-3 font-mono text-[15px] text-ink outline-none ring-brand-green/30 transition focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-1 rounded-full bg-brand-green px-6 py-3 font-inter text-[16px] font-semibold text-white transition hover:bg-[#033a20] active:scale-[0.99]"
          >
            {t('settings.save')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-full bg-surface px-6 py-3 font-inter text-[16px] font-semibold text-ink transition hover:bg-neutral-200/90"
          >
            {t('settings.cancel')}
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="mt-4 w-full rounded-xl py-2 font-inter text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {t('settings.resetDefaults')}
        </button>
      </div>
    </div>
  );
}
