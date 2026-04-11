import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchComboDetails } from '../api/comboDetails.js';
import { queryKeys } from '../api/queryKeys.js';
import { queryClient } from '../api/queryClient.js';
import { initComboSelections } from '../lib/comboPrice.js';
import { normalizeComboDetailsToProduct } from '../lib/normalizeComboDetails.js';
import { findUpsellById } from '../lib/findUpsellById.js';
import { resolveProductImage } from '../lib/menuProduct.js';
import { tEntity } from '../lib/tEntity.js';
import { pickUpsellItem } from '../i18n/translate.js';

const COMBO_DETAIL_STALE_MS = 5 * 60 * 1000;

export function useComboPizzaFlow({
  screen,
  locale,
  addItem,
  addPizzaItem,
  pizzaUpsellData,
}) {
  const [comboProduct, setComboProduct] = useState(null);
  const [comboSelections, setComboSelections] = useState({});
  const [comboPizzaBySlot, setComboPizzaBySlot] = useState({});
  const [changeSlotId, setChangeSlotId] = useState(null);
  const [comboDetailsLoading, setComboDetailsLoading] = useState(false);
  const mobileComboFetchLock = useRef(false);

  const [pizzaProduct, setPizzaProduct] = useState(null);
  const [showPizzaUpsell, setShowPizzaUpsell] = useState(false);
  const [pizzaDraft, setPizzaDraft] = useState(null);

  const changeSlot = useMemo(
    () => comboProduct?.combo?.slots?.find((s) => s.id === changeSlotId) ?? null,
    [comboProduct, changeSlotId],
  );

  const openComboModal = useCallback(
    async (product) => {
      setChangeSlotId(null);

      if (product?.kind === 'mobileCombo' && product.sourceActionId) {
        if (mobileComboFetchLock.current) return;
        mobileComboFetchLock.current = true;
        setComboDetailsLoading(true);
        setComboProduct({ ...product, combo: null });
        setComboSelections({});
        setComboPizzaBySlot({});
        try {
          const raw = await queryClient.fetchQuery({
            queryKey: queryKeys.combo.detail(product.sourceActionId, locale),
            queryFn: () => fetchComboDetails(product.sourceActionId, locale),
            staleTime: COMBO_DETAIL_STALE_MS,
          });
          const normalized = normalizeComboDetailsToProduct(raw, locale);
          if (!normalized) throw new Error('Invalid combo details');
          setComboProduct(normalized);
          setComboSelections(initComboSelections(normalized.combo));
          setComboPizzaBySlot({});
        } catch {
          setComboProduct(null);
          setComboSelections({});
          setComboPizzaBySlot({});
        } finally {
          setComboDetailsLoading(false);
          mobileComboFetchLock.current = false;
        }
        return;
      }

      if (!product?.combo) return;
      setComboDetailsLoading(false);
      setComboProduct(product);
      setComboSelections(initComboSelections(product.combo));
      setComboPizzaBySlot({});
    },
    [locale],
  );

  const closeComboModal = useCallback(() => {
    setComboProduct(null);
    setChangeSlotId(null);
    setComboDetailsLoading(false);
    setComboSelections({});
    setComboPizzaBySlot({});
  }, []);

  const openPizzaModal = useCallback((product) => {
    setPizzaProduct(product);
    setShowPizzaUpsell(false);
  }, []);

  const closePizzaFlow = useCallback(() => {
    setPizzaProduct(null);
    setShowPizzaUpsell(false);
  }, []);

  const handleUpsellFinish = useCallback(
    (counts) => {
      if (!pizzaProduct || !pizzaDraft) {
        closePizzaFlow();
        return;
      }
      const line = pizzaDraft.lineProduct;
      const baseProduct = line
        ? {
            ...pizzaProduct,
            id: line.id ?? pizzaProduct.id,
            image: resolveProductImage(line),
          }
        : pizzaProduct;
      addPizzaItem(
        { ...baseProduct, name: tEntity(line ?? pizzaProduct, locale, 'name') },
        {
          unitPrice: pizzaDraft.unitPrice,
          pizzaConfig: pizzaDraft.selections,
          detailLine: pizzaDraft.detailLine,
        },
      );
      for (const [id, qty] of Object.entries(counts)) {
        const n = Number(qty) || 0;
        if (n <= 0) continue;
        const u = findUpsellById(id, pizzaUpsellData);
        if (!u) continue;
        const productLike = {
          id: `upsell-${id}`,
          name: pickUpsellItem(locale, u).name,
          price: u.price,
          image: u.image,
        };
        for (let i = 0; i < n; i += 1) {
          addItem(productLike);
        }
      }
      closePizzaFlow();
      setPizzaDraft(null);
    },
    [addItem, addPizzaItem, closePizzaFlow, locale, pizzaDraft, pizzaProduct, pizzaUpsellData],
  );

  useEffect(() => {
    if (screen !== 'menu') {
      setComboProduct(null);
      setChangeSlotId(null);
      setComboDetailsLoading(false);
      setComboPizzaBySlot({});
    }
    if (screen !== 'menu' && screen !== 'cart') {
      closePizzaFlow();
      setPizzaDraft(null);
    }
  }, [closePizzaFlow, screen]);

  return {
    comboProduct,
    comboSelections,
    setComboSelections,
    comboPizzaBySlot,
    setComboPizzaBySlot,
    changeSlotId,
    setChangeSlotId,
    changeSlot,
    openComboModal,
    closeComboModal,
    comboDetailsLoading,
    pizzaProduct,
    showPizzaUpsell,
    setShowPizzaUpsell,
    pizzaDraft,
    setPizzaDraft,
    openPizzaModal,
    closePizzaFlow,
    handleUpsellFinish,
  };
}
