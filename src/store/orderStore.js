import { create } from 'zustand';
import { computeComboDelta, computeComboPizzaExtrasSum } from '../lib/comboPrice.js';
import { comboReceiptDetails } from '../lib/receiptItems.js';

/** Hidden-corner taps must land within this window to count toward the admin gesture. */
const ADMIN_CORNER_TAP_WINDOW_MS = 2000;
/** Number of rapid corner taps that opens the admin panel. */
const ADMIN_CORNER_TAP_COUNT = 5;

function newLineId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ln_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function lineTotal(item) {
  if (item.kind === 'combo') {
    return Math.round((item.basePrice + item.comboDelta) * item.qty);
  }
  if (item.kind === 'pizza') {
    return Math.round(item.unitPrice * item.qty);
  }
  return Math.round(item.price * item.qty);
}

export const useOrderStore = create((set, get) => ({
  /** welcome → language → menu | cart | payment | success */
  screen: 'welcome',
  categoryId: null,
  cart: [],
  orderNumber: null,
  lastError: null,
  adminOpen: false,
  cornerTaps: 0,
  cornerLast: 0,
  /** uz | ru | en */
  locale: 'uz',
  /** dine-in | takeaway */
  orderType: null,

  setCategory: (id) => set({ categoryId: id }),

  setLocale: (locale) => set({ locale }),

  setOrderType: (orderType) => set({ orderType }),

  addItem: (product) => {
    set((state) => {
      const cleaned = state.cart.filter((c) => !(c.id === product.id && c.kind === 'combo'));
      const existing = cleaned.find((c) => c.id === product.id);
      if (existing) {
        return {
          cart: cleaned.map((c) =>
            c === existing
              ? {
                  ...c,
                  qty: c.qty + 1,
                  lineTotal: lineTotal({ ...c, qty: c.qty + 1 }),
                }
              : c,
          ),
        };
      }
      const row = {
        lineId: newLineId(),
        id: product.id,
        productId: product.productId ?? product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        lineTotal: product.price,
        image: product.image || '/menu-items/placeholder.svg',
        oldPrice: product.oldPrice,
      };
      return { cart: [...cleaned, row] };
    });
  },

  addComboItem: (product, comboSelections, comboPizzaBySlot = {}) => {
    const locale = get().locale;
    const delta =
      computeComboDelta(product.combo, comboSelections) +
      computeComboPizzaExtrasSum(product.combo, comboSelections, comboPizzaBySlot, locale);
    const unit = product.price + delta;
    set((state) => {
      const existing = state.cart.find(
        (c) =>
          c.id === product.id &&
          c.kind === 'combo' &&
          JSON.stringify(c.comboSelections) === JSON.stringify(comboSelections) &&
          JSON.stringify(c.comboPizzaBySlot ?? {}) === JSON.stringify(comboPizzaBySlot),
      );
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c === existing
              ? {
                  ...c,
                  qty: c.qty + 1,
                  lineTotal: lineTotal({ ...c, qty: c.qty + 1 }),
                }
              : c,
          ),
        };
      }
      const row = {
        lineId: newLineId(),
        id: product.id,
        name: product.name,
        price: product.price,
        basePrice: product.price,
        comboDelta: delta,
        qty: 1,
        lineTotal: unit,
        image: product.image || '/menu-items/placeholder.svg',
        kind: 'combo',
        // iiko combo source id for the order's combos[] entry.
        sourceId: product.sourceActionId ?? product.id,
        comboSelections,
        comboPizzaBySlot,
        oldPrice: product.oldPrice,
        detailLine: product.combo?.description,
        // Chosen component per slot, resolved now while product.combo is at hand.
        receiptDetails: comboReceiptDetails(product.combo, comboSelections, comboPizzaBySlot, locale),
      };
      // Append as a distinct line — two differently-configured copies of the
      // same combo must coexist. (An exact-match duplicate is merged above.)
      return { cart: [...state.cart, row] };
    });
  },

  addPizzaItem: (
    product,
    { unitPrice, pizzaConfig, detailLine, receiptDetails, orderProductId, orderBasePrice, orderModifiers },
  ) => {
    set((state) => {
      const row = {
        lineId: newLineId(),
        id: product.id,
        name: product.name,
        unitPrice,
        price: unitPrice,
        qty: 1,
        lineTotal: unitPrice,
        image: product.image || '/menu-items/placeholder.svg',
        kind: 'pizza',
        pizzaConfig,
        detailLine,
        receiptDetails: Array.isArray(receiptDetails) ? receiptDetails : [],
        // iiko order data captured at add-time (base dish + modifier groups).
        orderProductId: orderProductId ?? product.productId ?? product.id,
        orderBasePrice: orderBasePrice ?? unitPrice,
        orderModifiers: Array.isArray(orderModifiers) ? orderModifiers : [],
        oldPrice: product.oldPrice,
      };
      return { cart: [...state.cart, row] };
    });
  },

  /** Increment quantity for the cart line with this lineId */
  incItem: (lineId) => {
    set((state) => {
      const idx = state.cart.findIndex((c) => c.lineId === lineId);
      if (idx === -1) return state;
      const c = state.cart[idx];
      return {
        cart: state.cart.map((row, i) =>
          i === idx
            ? {
                ...c,
                qty: c.qty + 1,
                lineTotal: lineTotal({ ...c, qty: c.qty + 1 }),
              }
            : row,
        ),
      };
    });
  },

  decItem: (lineId) => {
    set((state) => {
      const idx = state.cart.findIndex((c) => c.lineId === lineId);
      if (idx === -1) return state;
      const c = state.cart[idx];
      const nextQty = c.qty - 1;
      const next = state.cart
        .map((row, i) =>
          i === idx
            ? {
                ...c,
                qty: nextQty,
                lineTotal: lineTotal({ ...c, qty: nextQty }),
              }
            : row,
        )
        .filter((row) => row.qty > 0);
      return { cart: next };
    });
  },

  /** First cart line matching product id (for menu grid steppers). */
  incItemByProductId: (productId) => {
    const line = get().cart.find((c) => c.id === productId);
    if (line?.lineId) get().incItem(line.lineId);
  },

  decItemByProductId: (productId) => {
    const line = get().cart.find((c) => c.id === productId);
    if (line?.lineId) get().decItem(line.lineId);
  },

  /** Remove a single cart line by its unique lineId. */
  removeItem: (lineId) => set((state) => ({ cart: state.cart.filter((c) => c.lineId !== lineId) })),

  clearCart: () => set({ cart: [] }),

  setScreen: (screen) => set({ screen }),

  setOrderNumber: (n) => set({ orderNumber: n }),

  setLastError: (msg) => set({ lastError: msg }),

  resetFlow: () =>
    set({
      screen: 'welcome',
      cart: [],
      orderNumber: null,
      lastError: null,
      categoryId: null,
      locale: 'uz',
      orderType: null,
    }),

  registerCornerTap: () => {
    set((state) => {
      const now = Date.now();
      const within = state.cornerLast && now - state.cornerLast < ADMIN_CORNER_TAP_WINDOW_MS;
      const taps = within ? state.cornerTaps + 1 : 1;
      const adminOpen = taps >= ADMIN_CORNER_TAP_COUNT ? true : state.adminOpen;
      return { cornerTaps: taps, cornerLast: now, adminOpen };
    });
  },

  closeAdmin: () => set({ adminOpen: false, cornerTaps: 0, cornerLast: 0 }),
}));
