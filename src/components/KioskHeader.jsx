import { useI18n } from '../hooks/useI18n.js';
import { IconArrowLeft } from './icons.jsx';

export function KioskHeader({ onBack, online }) {
  const { t } = useI18n();

  return (
    <header className="relative z-20 flex h-[50px] w-full shrink-0 items-center border-b border-white bg-brand-orange">
      <button
        type="button"
        onClick={onBack}
        className="flex h-full items-center gap-2.5 px-6 text-[#fbfbfd] transition hover:opacity-90"
      >
        <IconArrowLeft className="h-7 w-7 shrink-0 text-white" />
        <span className="text-[18px] font-semibold tracking-wide">{t('common.backMenu')}</span>
      </button>
      <div className="ml-auto flex items-center gap-2 pr-4">
        <span
          className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-300' : 'bg-white/50'}`}
          title={online ? t('status.online') : t('status.offline')}
        />
      </div>
    </header>
  );
}
