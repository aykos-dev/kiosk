import { useCallback, useEffect, useMemo, useState } from "react";
import staticPizzaTemplate from "../data/pizzaTemplate.json";
import { buildPizzaTemplateFromApiProduct } from "../lib/apiPizzaTemplate.js";
import {
  computeComboDelta,
  computeComboPizzaExtrasSum,
  isComboPizzaOption,
} from "../lib/comboPrice.js";
import { formatUzs } from "../lib/formatUzs.js";
import {
  formatPizzaDetailLine,
  initPizzaSelections,
} from "../lib/pizzaPrice.js";
import { comboOptionLabel, pickCrustName } from "../i18n/translate.js";
import { tEntity } from "../lib/tEntity.js";
import { useI18n } from "../hooks/useI18n.js";
import { PizzaCustomizeForm } from "./PizzaCustomizeForm.jsx";

function IconClose({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 10l12 12M22 10L10 22"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      className="h-4 w-4 text-white"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronBack({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M19 8l-8 8 8 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDeltaSom(locale, t, n) {
  if (!n) return t("common.currencyZero");
  const spaced = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return t("common.currencyPlus", { amount: spaced });
}

function mergePizzaSelections(template, stored) {
  const init = initPizzaSelections(template);
  if (!stored) return init;
  return {
    ...init,
    ...stored,
    toppings: { ...init.toppings, ...(stored.toppings || {}) },
  };
}

/**
 * Swap combo slot item (Figma 4287:25990). Footer bar 4287:26015.
 */
export function ComboItemChangeModal({
  title,
  slot,
  selectedId,
  comboProduct,
  comboSelections,
  comboPizzaBySlot,
  onClose,
  onConfirm,
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(selectedId);
  const [view, setView] = useState("pick");
  const [pizzaSel, setPizzaSel] = useState(null);

  const heading = title ?? t("comboChange.title");
  const combo = comboProduct?.combo;

  useEffect(() => {
    setDraft(selectedId);
    setView("pick");
    setPizzaSel(null);
  }, [selectedId, slot?.id]);

  const selectedOpt = slot?.options?.find((o) => o.id === draft);
  const isPizza = selectedOpt && isComboPizzaOption(selectedOpt, slot);

  const template = useMemo(() => {
    if (!isPizza || !selectedOpt) return null;
    if (selectedOpt.apiProduct) {
      const built = buildPizzaTemplateFromApiProduct(
        selectedOpt.apiProduct,
        locale,
      );
      if (built.crusts?.length) return built;
    }
    return staticPizzaTemplate;
  }, [isPizza, selectedOpt, locale]);

  const slotId = slot?.id;

  const draftSelections = useMemo(() => {
    if (!combo || !slotId) return comboSelections;
    return { ...comboSelections, [slotId]: draft };
  }, [combo, comboSelections, slotId, draft]);

  const mergedPizzaBySlot = useMemo(() => {
    const base = { ...(comboPizzaBySlot || {}) };
    if (view === "customize" && pizzaSel && template && slotId && isPizza) {
      base[slotId] = { selections: pizzaSel, detailLine: "" };
    }
    return base;
  }, [comboPizzaBySlot, view, pizzaSel, template, slotId, isPizza]);

  const upgradeDelta = useMemo(() => {
    if (!combo) return 0;
    return (
      computeComboDelta(combo, draftSelections) +
      computeComboPizzaExtrasSum(
        combo,
        draftSelections,
        mergedPizzaBySlot,
        locale,
      )
    );
  }, [combo, draftSelections, mergedPizzaBySlot, locale]);

  const totalPrice = (Number(comboProduct?.price) || 0) + upgradeDelta;

  const sortedOptions = useMemo(
    () =>
      [...(slot?.options ?? [])].sort(
        (a, b) => (Number(a.priceDelta) || 0) - (Number(b.priceDelta) || 0),
      ),
    [slot?.options],
  );

  const openCustomize = useCallback(() => {
    if (!template || !slotId) return;
    const merged = mergePizzaSelections(
      template,
      comboPizzaBySlot?.[slotId]?.selections,
    );
    setPizzaSel(merged);
    setView("customize");
  }, [template, comboPizzaBySlot, slotId]);

  const handleConfirm = () => {
    const opt = slot.options.find((o) => o.id === draft);
    if (isComboPizzaOption(opt, slot) && template) {
      const sel =
        view === "customize" && pizzaSel
          ? pizzaSel
          : mergePizzaSelections(
              template,
              comboPizzaBySlot?.[slotId]?.selections,
            );
      const crust = template.crusts?.find((c) => c.id === sel.crustId);
      const bort = template.borts?.find((b) => b.id === sel.bortId);
      const size = template.sizes?.find((s) => s.id === sel.sizeId);
      const detailLine = formatPizzaDetailLine(template, sel, locale, {
        crustName: pickCrustName(locale, sel.crustId, crust?.name),
        bortName: pickCrustName(locale, sel.bortId, bort?.name),
        sizeLabel: size?.label ?? "",
      });
      onConfirm(draft, { selections: sel, detailLine });
      return;
    }
    onConfirm(draft);
  };

  if (!slot?.options?.length || !comboProduct || !combo) return null;

  const ctaLabel =
    upgradeDelta > 0
      ? t("comboChange.applyForExtra", { amount: formatUzs(upgradeDelta) })
      : t("comboChange.select");

  const showYellowCustomize = view === "pick" && isPizza && template;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(30,30,30,0.7)] p-0 sm:p-3"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[min(92svh,1433px)] w-full max-w-[740px] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-dock">
        <div className="relative z-[2] flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex w-full max-w-[740px] shrink-0 items-center gap-3 px-4 pt-8 min-[400px]:px-6">
            {view === "customize" ? (
              <button
                type="button"
                onClick={() => setView("pick")}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50"
                aria-label={t("comboChange.backToPicks")}
              >
                <IconChevronBack className="text-ink" />
              </button>
            ) : (
              <div className="h-12 w-12 shrink-0 sm:w-[48px]" aria-hidden />
            )}
            <h2 className="font-product-700 min-h-[48px] min-w-0 flex-1 text-center text-[clamp(1.25rem,3.5vw,1.75rem)] leading-tight tracking-tight text-ink">
              <span className="line-clamp-2">{heading}</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50"
              aria-label={t("common.close")}
            >
              <IconClose />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-20 pt-6 min-[400px]:px-6">
            {view === "pick" ? (
              <div className="mx-auto flex w-full max-w-[692px] flex-wrap justify-center gap-4">
                {sortedOptions.map((opt) => {
                  const selected = draft === opt.id;
                  const label = comboOptionLabel(locale, opt.id, opt.name);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft(opt.id)}
                      className={`relative flex w-full max-w-[220px] flex-col gap-3 rounded-[28px] bg-white px-2 pb-4 pt-2 text-left shadow-card transition sm:w-[220px] ${
                        selected
                          ? "border-2 border-[#03381e] ring-0"
                          : "border-2 border-transparent"
                      }`}
                    >
                      <div className="relative h-[168px] w-full overflow-hidden rounded-2xl">
                        <img
                          src={opt.image}
                          alt=""
                          className="h-full w-full object-cover mix-blend-multiply"
                          loading="lazy"
                          decoding="async"
                        />
                        {opt.badge && (
                          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {opt.badge === "HIT!" ? t("common.hit") : opt.badge}
                          </span>
                        )}
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-green shadow-md">
                            <IconCheck />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 px-1 text-center">
                        <p className="font-inter-600 line-clamp-2 min-h-[48px] text-[18px] leading-6 text-brand-green">
                          {label}
                        </p>
                        <p className="font-inter-400 text-base leading-6 text-ink">
                          {opt.priceDelta === 0 ? (
                            <>
                              <span className="text-ink-muted">
                                {t("comboChange.inCombo")}
                              </span>
                              <br />
                              {formatDeltaSom(locale, t, 0)}
                            </>
                          ) : (
                            formatDeltaSom(locale, t, opt.priceDelta)
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              template && selectedOpt && (
                <div className="mx-auto w-full max-w-[692px] pb-4">
                  <PizzaCustomizeForm
                    template={template}
                    sel={
                      pizzaSel ??
                      mergePizzaSelections(
                        template,
                        comboPizzaBySlot?.[slotId]?.selections,
                      )
                    }
                    onSelChange={(updater) => {
                      setPizzaSel((prev) => {
                        const base =
                          prev ??
                          mergePizzaSelections(
                            template,
                            comboPizzaBySlot?.[slotId]?.selections,
                          );
                        return typeof updater === "function"
                          ? updater(base)
                          : updater;
                      });
                    }}
                    header={{
                      heroImage: selectedOpt.image,
                      title: comboOptionLabel(
                        locale,
                        selectedOpt.id,
                        selectedOpt.name,
                      ),
                      description: selectedOpt.apiProduct
                        ? tEntity(selectedOpt.apiProduct, locale, "description") ||
                          undefined
                        : undefined,
                      badgeHit: selectedOpt.badge === "HIT!",
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div className="relative z-[100] shrink-0 rounded-t-[32px] border-t border-black/5 bg-white px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 shadow-none">
          {showYellowCustomize && (
            <div className="absolute -top-16 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={openCustomize}
                className="font-product-600 min-h-[56px] w-full max-w-[360px] rounded-full bg-[#ffc600] px-6 py-3 text-[18px] leading-6 tracking-[-0.15px] text-ink shadow-none transition hover:brightness-95 active:scale-[0.99]"
              >
                {t("comboChange.customizeComposition")}
              </button>
            </div>
          )}
          <div className="mx-auto flex w-full max-w-[692px] flex-row flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              {comboProduct.oldPrice != null &&
              Number(comboProduct.oldPrice) > 0 ? (
                <p className="font-inter-600 relative w-fit text-[15px] leading-4 text-[#8e8e8e] line-through decoration-red-500">
                  {formatUzs(comboProduct.oldPrice)}
                </p>
              ) : null}
              <p className="font-product-600 text-[22px] leading-7 tracking-[-0.15px] text-ink">
                {formatUzs(totalPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              className="font-product-600 min-h-[56px] w-full min-w-[200px] shrink-0 rounded-full bg-brand-green px-6 py-3 text-[18px] leading-6 tracking-[-0.15px] text-white shadow-[0px_4px_32px_rgba(0,0,0,0.1)] transition hover:bg-[#033a20] active:scale-[0.99] sm:w-auto sm:max-w-[360px] sm:flex-1"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
