import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getCombosQueryOptions } from '../api/combos.js';
import { menuQuery } from '../api/menu.js';
import { promoQuery } from '../api/promo.js';
import { getSliderQueryOptions } from '../api/slider.js';
import { COMBO_CATALOG_CATEGORY_ID } from '../lib/comboCatalogConstants.js';
import { useI18n } from './useI18n.js';
import {
  isComboGroup,
  isComboProduct,
  isPizzaCategory,
  normalizeGroupForMenuCard,
  normalizeMobileComboOffer,
  normalizeProductForMenuCard,
} from '../lib/menuProduct.js';

const DEFAULT_HERO = '/menu-items/hero-banner.svg';

/** Sidebar row for mobile combo offers (only when API returns data). */
const COMBO_CATEGORY_TEMPLATE = {
  id: COMBO_CATALOG_CATEGORY_ID,
  menuType: 'comboCatalog',
  icon: 'combo',
  name: 'Kombo',
  translations: {
    title: {
      uz: 'Kombolar',
      ru: 'Комбо',
      en: 'Combos',
    },
  },
};

/** Non-pizza: flatten products from groups and category-level products. */
function flattenCategoryItems(cat) {
  if (!cat) return [];
  const fromGroups = (cat.groups ?? []).flatMap((g) => [...(g.products ?? [])]);
  const direct = [...(cat.products ?? [])];
  return [...fromGroups, ...direct];
}

export function useMenuCatalog(screen, categoryId, setCategory) {
  const { locale } = useI18n();
  const { data: categories = [] } = useQuery(menuQuery);
  const { data: slides = [] } = useQuery(getSliderQueryOptions(locale));
  const { data: promos = [] } = useQuery(promoQuery);
  const {
    data: combos = [],
    isSuccess: combosQuerySuccess,
    isFetched: combosFetched,
  } = useQuery(getCombosQueryOptions(locale));

  const hasComboCatalog = combosQuerySuccess && combos.length > 0;

  /** Hide pizza-line «Комбо» group when the mobile combo catalog is shown (avoid duplicates). */
  const hidePizzaComboGroupLine = combosFetched && hasComboCatalog;

  const categoriesFiltered = useMemo(() => {
    if (!hidePizzaComboGroupLine) return categories;
    return categories.map((cat) => {
      if (!isPizzaCategory(cat)) return cat;
      return {
        ...cat,
        groups: (cat.groups ?? []).filter((g) => !isComboGroup(g)),
      };
    });
  }, [categories, hidePizzaComboGroupLine]);

  const sidebarCategories = useMemo(() => {
    if (!hasComboCatalog) return categoriesFiltered;
    return [COMBO_CATEGORY_TEMPLATE, ...categoriesFiltered];
  }, [hasComboCatalog, categoriesFiltered]);

  const heroSlides = useMemo(() => {
    const list = [];
    for (const s of slides) {
      if (!s || typeof s !== 'object') continue;
      const src = s.picture_url ?? s.image ?? s.src ?? s.url;
      if (!src) continue;
      list.push({
        src,
        alt: typeof s.alternative_text === 'string' ? s.alternative_text : '',
      });
    }
    if (!list.length) return [{ src: DEFAULT_HERO, alt: '' }];
    return list;
  }, [slides]);

  /** Default category: wait for combos fetch; if offers exist, select combo tab first. */
  useEffect(() => {
    if (screen !== 'menu') return;
    if (!categoriesFiltered.length) return;
    if (!combosFetched) return;
    if (categoryId != null) return;
    setCategory(sidebarCategories[0]?.id ?? null);
  }, [screen, categoriesFiltered, combosFetched, sidebarCategories, categoryId, setCategory]);

  /** Leave combo tab if API later returns empty. */
  useEffect(() => {
    if (screen !== 'menu') return;
    if (!combosFetched) return;
    if (categoryId !== COMBO_CATALOG_CATEGORY_ID) return;
    if (!hasComboCatalog) {
      setCategory(categoriesFiltered[0]?.id ?? null);
    }
  }, [
    screen,
    combosFetched,
    categoryId,
    hasComboCatalog,
    categoriesFiltered,
    setCategory,
  ]);

  const activeItems = useMemo(() => {
    if (!categoryId) return [];
    if (categoryId === COMBO_CATALOG_CATEGORY_ID && hasComboCatalog) {
      return combos
        .map((row) => normalizeMobileComboOffer(row, locale))
        .filter(Boolean);
    }
    const cat = categoriesFiltered.find((c) => c.id === categoryId);
    if (!cat) return [];
    if (isPizzaCategory(cat)) {
      return (cat.groups ?? []).map((g) => normalizeGroupForMenuCard(g, locale));
    }
    const flat = flattenCategoryItems(cat).filter(
      (p) => !hasComboCatalog || !isComboProduct(p),
    );
    return flat.map((p) => normalizeProductForMenuCard(p, locale));
  }, [categoryId, categoriesFiltered, locale, combos, hasComboCatalog]);

  return {
    categories: sidebarCategories,
    heroSlides,
    activeItems,
    promos,
  };
}
