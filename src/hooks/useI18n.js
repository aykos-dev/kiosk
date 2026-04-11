import { useMemo } from 'react';
import { translate } from '../i18n/translate.js';
import { useOrderStore } from '../store/orderStore.js';

export function useI18n() {
  const locale = useOrderStore((s) => s.locale);

  const t = useMemo(
    () => (key, vars) => translate(locale, key, vars),
    [locale],
  );

  return { t, locale };
}
