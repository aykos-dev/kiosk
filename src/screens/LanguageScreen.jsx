import { useI18n } from '../hooks/useI18n.js';
import { SmileHero } from '../components/SmileHero.jsx';
import iconDineIn from '../../assets/icons/in-restaurant.svg';
import iconTakeaway from '../../assets/icons/take-away.svg';

const LANGS = [
  { id: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { id: 'ru', label: 'Русский', flag: '🇷🇺' }
];

export function LanguageScreen({
  locale,
  orderType,
  onLocale,
  onOrderType,
  onContinue,
  onBack,
}) {
  const { t } = useI18n();
  const canContinue = Boolean(locale && orderType);

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-kiosk flex-col overflow-visible bg-white">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 z-30 rounded-full bg-black/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm"
      >
        {t('language.back')}
      </button>

      <SmileHero label={t('language.mazali')} />

      <div className="flex flex-1 flex-col overflow-visible px-8 pb-8 pt-0 sm:px-14 z-[1]">
        <div className="mx-auto -mt-6 flex w-full max-w-[628px] flex-col gap-3 text-center sm:-mt-8">
          <h1 className="overflow-visible pt-1 font-product-700 text-[44px] leading-[1.22] tracking-[-0.2px] text-ink [text-rendering:optimizeLegibility]">
            {t('language.title')}
          </h1>
          <p className="font-inter-400 text-[24px] leading-7 text-ink">
            {t('language.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-16 flex w-full max-w-[628px] gap-6">
          <button
            type="button"
            onClick={() => onOrderType('dine-in')}
            className={`flex h-[240px] min-h-[240px] flex-1 flex-col items-center justify-center gap-5 rounded-[32px] bg-white px-6 py-5 shadow-[0px_2px_28px_0px_rgba(0,0,0,0.12)] transition ring-2 ${orderType === 'dine-in' ? 'ring-brand-green' : 'ring-transparent'
              }`}
          >
            <img src={iconDineIn} alt="" className="h-[120px] w-[120px] shrink-0" />
            <span className="font-product-600 text-[24px] leading-8 text-ink">{t('language.dineIn')}</span>
          </button>
          <button
            type="button"
            onClick={() => onOrderType('takeaway')}
            className={`flex h-[240px] min-h-[240px] flex-1 flex-col items-center justify-center gap-5 rounded-[32px] bg-white px-6 py-5 shadow-[0px_2px_28px_0px_rgba(0,0,0,0.12)] transition ring-2 ${orderType === 'takeaway' ? 'ring-brand-green' : 'ring-transparent'
              }`}
          >
            <img src={iconTakeaway} alt="" className="h-[120px] w-[120px] shrink-0" />
            <span className="font-product-600 text-[24px] leading-8 text-ink">{t('language.takeaway')}</span>
          </button>
        </div>

        <div className="mx-auto mt-16 flex w-full max-w-[628px] flex-col gap-6">
          <p className="text-center font-inter-600 text-[24px] leading-7 text-ink">{t('language.chooseLanguage')}</p>
          <div className="flex w-full gap-4">
            {LANGS.map((l) => {
              const active = locale === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onLocale(l.id)}
                  className={`flex h-[72px] min-h-[72px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-4 transition ${active
                      ? 'border-2 border-brand-green bg-surface'
                      : 'border-2 border-transparent bg-surface'
                    }`}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {l.flag}
                  </span>
                  <span className="font-inter-600 text-[20px] leading-7 text-ink">{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-[628px]">
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="w-full rounded-full bg-brand-green py-4 font-inter-600 text-xl text-white shadow-md transition hover:bg-[#033a20] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {t('language.continue')}
          </button>
        </div>
      </div>

      <div className="h-6 w-full shrink-0 bg-brand-orange" aria-hidden />
    </div>
  );
}
