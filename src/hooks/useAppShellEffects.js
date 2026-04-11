import { useEffect } from 'react';

export function useAppShellEffects({ locale }) {
  useEffect(() => {
    document.documentElement.lang =
      locale === 'ru' ? 'ru' : locale === 'en' ? 'en' : 'uz';
  }, [locale]);
}
