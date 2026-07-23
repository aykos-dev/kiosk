import { useI18n } from '../hooks/useI18n.js';
import { SmileHero } from '../components/SmileHero.jsx';
import iconDineIn from '../../assets/icons/in-restaurant.svg';
import iconTakeaway from '../../assets/icons/take-away.svg';

const LANGS = [
  { id: 'uz', label: "🇺🇿 O'zbek" },
  { id: 'ru', label: '🇷🇺 Русский' },
  { id: 'en', label: '🇬🇧 English' },
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

  /** Picking an order type is the last decision — commit and advance. */
  const chooseOrderType = (type) => {
    onOrderType(type);
    onContinue();
  };

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

      <div className="z-[1] flex flex-1 flex-col overflow-visible px-8 pb-8 pt-2 sm:px-14">
        <div className="mx-auto flex w-full max-w-[628px] flex-col gap-3 text-center">
          <h1 className="font-product-700 pt-1 text-[clamp(28px,6vw,44px)] leading-[1.15] tracking-[-0.2px] text-ink [text-rendering:optimizeLegibility]">
            {t('language.title')}
          </h1>
          <p className="font-inter-400 text-[clamp(16px,3.2vw,24px)] leading-7 text-ink">
            {t('language.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-[clamp(2rem,5vw,3.5rem)] flex w-full max-w-[628px] flex-col gap-4">
          <p className="text-center font-inter-600 text-[clamp(18px,3.5vw,24px)] leading-7 text-ink">
            {t('language.chooseLanguage')}
          </p>
          <div className="flex w-full gap-4">
            {LANGS.map((l) => {
              const active = locale === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onLocale(l.id)}
                  className={`flex h-[clamp(60px,9vw,72px)] flex-1 items-center justify-center gap-2 rounded-full border-2 bg-surface px-4 transition ${
                    active ? 'border-brand-green' : 'border-transparent'
                  }`}
                >
                  <span className="font-inter-600 text-[clamp(16px,3vw,20px)] leading-7 text-ink">
                    {l.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-[clamp(2rem,6vw,4rem)] flex w-full max-w-[628px] flex-col gap-4">
          <p className="text-center font-inter-600 text-[clamp(18px,3.5vw,24px)] leading-7 text-ink">
            {t('language.chooseOrderType')}
          </p>
          <div className="flex w-full gap-6">
            <button
              type="button"
              onClick={() => chooseOrderType('dine-in')}
              className={`flex h-[clamp(180px,28vw,240px)] flex-1 flex-col items-center justify-center gap-5 rounded-[32px] bg-white px-6 py-5 shadow-[0px_2px_28px_0px_rgba(0,0,0,0.12)] transition ring-2 ${
                orderType === 'dine-in' ? 'ring-brand-green' : 'ring-transparent'
              }`}
            >
              <img src={iconDineIn} alt="" className="h-[clamp(84px,16vw,120px)] w-[clamp(84px,16vw,120px)] shrink-0" />
              <span className="font-product-600 text-[clamp(18px,3.4vw,24px)] leading-8 text-ink">
                {t('language.dineIn')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => chooseOrderType('takeaway')}
              className={`flex h-[clamp(180px,28vw,240px)] flex-1 flex-col items-center justify-center gap-5 rounded-[32px] bg-white px-6 py-5 shadow-[0px_2px_28px_0px_rgba(0,0,0,0.12)] transition ring-2 ${
                orderType === 'takeaway' ? 'ring-brand-green' : 'ring-transparent'
              }`}
            >
              <img src={iconTakeaway} alt="" className="h-[clamp(84px,16vw,120px)] w-[clamp(84px,16vw,120px)] shrink-0" />
              <span className="font-product-600 text-[clamp(18px,3.4vw,24px)] leading-8 text-ink">
                {t('language.takeaway')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="h-6 w-full shrink-0 bg-brand-orange" aria-hidden />
    </div>
  );
}
