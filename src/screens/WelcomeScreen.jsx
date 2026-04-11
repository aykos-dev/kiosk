import { useCallback, useRef } from 'react';
import welcomeImage from '../../assets/images/welcome.jpeg';
import bellissimoLogo from '../../assets/images/bellissimo-logo.png';
import { useI18n } from '../hooks/useI18n.js';

const LOGO_TAP_WINDOW_MS = 2000;
const LOGO_TAPS_REQUIRED = 5;

export function WelcomeScreen({ onStart, onOpenSettings }) {
  const { t } = useI18n();
  const logoTapRef = useRef({ count: 0, last: 0 });

  const handleLogoTap = useCallback(() => {
    if (!onOpenSettings) return;
    const now = Date.now();
    const w = logoTapRef.current;
    const within = w.last && now - w.last < LOGO_TAP_WINDOW_MS;
    w.count = within ? w.count + 1 : 1;
    w.last = now;
    if (w.count >= LOGO_TAPS_REQUIRED) {
      w.count = 0;
      w.last = 0;
      onOpenSettings();
    }
  }, [onOpenSettings]);

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-kiosk overflow-hidden bg-black">
      <img
        src={welcomeImage}
        alt=""
        className="h-full w-full object-cover object-center"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/menu-items/welcome-fallback.svg';
        }}
      />

      <button
        type="button"
        onClick={handleLogoTap}
        className="absolute left-6 top-6 z-10 max-w-[min(85vw,280px)] rounded-lg outline-none ring-offset-2 ring-offset-black/50 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99]"
        aria-label="Bellissimo Pizza"
      >
        <img src={bellissimoLogo} alt="" className="h-10 w-auto max-h-12 object-contain md:h-12" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-black/75 via-black/35 to-transparent px-6 pb-10 pt-20">
        <p className="pointer-events-none mb-3 text-center text-[16px] font-product-bold uppercase tracking-[-0.2px] text-white/95 md:text-lg">
          {t('welcome.tagline')}
        </p>
        <button
          type="button"
          onClick={onStart}
          className="pointer-events-auto w-full max-w-md rounded-2xl bg-white py-5 text-[18px] font-semibold text-[#161616] shadow-lg transition hover:bg-neutral-100 active:scale-[0.99]"
        >
          {t('welcome.cta')}
        </button>
      </div>
    </div>
  );
}
