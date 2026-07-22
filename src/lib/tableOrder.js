import {
  FALLBACK_TABLE_ORDER_ORGANIZATION_ID,
  FALLBACK_TABLE_ORDER_TERMINAL_ID,
} from './organizationConstants.js';

/**
 * Resolve the organization + terminal to send a table order to.
 *
 * Prefers the live organizations payload (matched by the persisted kiosk
 * organization id, else the first org that actually exposes a terminal), and
 * falls back to the hardcoded ids when the fetch produced nothing usable.
 *
 * @param {unknown[]} organizations - result of GET /v1.1/cities/{cityId}/organizations
 * @param {string} [storedOrganizationId] - persisted kiosk organization id
 * @returns {{ organizationId: string, terminalId: string, terminal: object | null }}
 */
export function resolveKioskOrderTarget(organizations, storedOrganizationId) {
  const list = Array.isArray(organizations) ? organizations : [];
  const org =
    list.find((o) => o && typeof o === 'object' && o.id === storedOrganizationId) ||
    list.find((o) => o && typeof o === 'object' && Array.isArray(o.terminals) && o.terminals.length) ||
    null;

  const terminal = org?.terminals?.[0] ?? null;

  const terminalId =
    (terminal?.id && String(terminal.id)) || FALLBACK_TABLE_ORDER_TERMINAL_ID;

  const organizationId =
    (terminal?.organizationId && String(terminal.organizationId)) ||
    (org?.id && String(org.id)) ||
    (storedOrganizationId && String(storedOrganizationId)) ||
    FALLBACK_TABLE_ORDER_ORGANIZATION_ID;

  return { organizationId, terminalId, terminal };
}

/**
 * Opaque per-checkout session code (the QR flow uses sha3_224(orgId + ts); the
 * backend treats it as an opaque grouping key, so a random 56-hex string — same
 * length as sha3_224 — is sufficient and keeps this dependency-free).
 * @returns {string}
 */
export function generateClientCode() {
  const bytes = new Uint8Array(28); // 28 bytes → 56 hex chars, matches sha3_224
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** Best-effort device notes block for the order payload. */
export function buildDeviceNotes(version) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  let os = 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Windows/.test(ua)) os = 'Windows';
  return {
    build: '1',
    version: String(version || '1.0.0'),
    device: {
      brand: 'Bellissimo Kiosk',
      manufacturer: 'Electron',
      modelName: 'Kiosk',
      year: 2024,
      memory: 0,
      os,
      osVersion: '',
    },
  };
}

/**
 * Build the iiko modifier list for a pizza line from the raw menu dish
 * (which carries the modifier group ids) and the customer's selections.
 *
 * @param {object} dish - raw /v3.1/menu Dish row (has .crusts/.borts/.toppings groups)
 * @param {{ crustId?: string, bortId?: string, toppings?: Record<string, number> }} sel
 * @returns {Array<{ productId: string, amount: number, productGroupId: string, price: number }>}
 */
export function buildPizzaOrderModifiers(dish, sel) {
  const mods = [];
  if (!dish || typeof dish !== 'object' || !sel) return mods;

  const pushSingle = (group, selectedId) => {
    const products = group?.products;
    if (!Array.isArray(products) || !selectedId) return;
    const p = products.find((x) => x?.id === selectedId);
    if (!p) return;
    mods.push({
      productId: p.id,
      amount: 1,
      productGroupId: group.id,
      price: Number(p.price) || 0,
    });
  };

  pushSingle(dish.crusts, sel.crustId);
  pushSingle(dish.borts, sel.bortId);

  const toppingGroup = dish.toppings;
  if (Array.isArray(toppingGroup?.products) && sel.toppings) {
    for (const p of toppingGroup.products) {
      const amount = Number(sel.toppings[p?.id]) || 0;
      if (amount <= 0) continue;
      mods.push({
        productId: p.id,
        amount,
        productGroupId: toppingGroup.id,
        price: Number(p.price) || 0,
      });
    }
  }

  return mods;
}

/**
 * Split the cart into the order payload's `items` (OrderProduct[]) and
 * `combos` (OrderCombo[]).
 *
 * Simple products and pizzas map to `items`; pizzas carry their crust/bort/
 * topping modifiers (captured when added to the cart). Combos map to the
 * `combos[]` array via their iiko source id. Per-slot combo selections are not
 * transmitted (the OrderCombo shape has no slot detail) — extend here if the
 * backend needs expanded combo component items.
 *
 * @param {Array<object>} cart
 */
export function buildTableOrderItems(cart) {
  const items = [];
  const combos = [];

  for (const line of Array.isArray(cart) ? cart : []) {
    const amount = Number(line.qty) || 1;

    if (line.kind === 'combo') {
      combos.push({
        id: line.id,
        name: line.name,
        amount,
        price: Math.round((Number(line.basePrice) || 0) + (Number(line.comboDelta) || 0)),
        sourceId: line.sourceId ?? line.id,
      });
      continue;
    }

    if (line.kind === 'pizza') {
      items.push({
        productId: line.orderProductId ?? line.id,
        name: line.name,
        type: 'Product',
        amount,
        positionId: null,
        price: Number(line.orderBasePrice ?? line.unitPrice ?? line.price) || 0,
        modifiers: Array.isArray(line.orderModifiers) ? line.orderModifiers : [],
        comboInformation: null,
      });
      continue;
    }

    items.push({
      productId: line.productId ?? line.id,
      name: line.name,
      type: 'Product',
      amount,
      positionId: null,
      price: Number(line.price) || 0,
      modifiers: [],
      comboInformation: null,
    });
  }

  return { items, combos };
}

/**
 * Build the full POST /table-orders/add request body.
 *
 * @param {object} params
 * @param {Array<object>} params.cart
 * @param {string} params.clientCode
 * @param {string} params.organizationId
 * @param {string} params.terminalId
 * @param {number} params.total - order total (so'm, integer)
 * @param {object|null} params.payment - single OrderPayment, or null to omit
 * @param {number|null} [params.tableNumber]
 * @param {string|null} [params.comment]
 * @param {string} [params.version] - app version for notes
 * @param {string} [params.turnstileToken] - Cloudflare Turnstile token, if any
 */
export function buildTableOrderPayload({
  cart,
  clientCode,
  organizationId,
  terminalId,
  total,
  payment,
  tableNumber = null,
  comment = null,
  version,
  turnstileToken = '',
}) {
  const { items, combos } = buildTableOrderItems(cart);

  const order = {
    completeBefore: null,
    deliveryPoint: null,
    comment: comment ?? null,
    sourceKey: 'kiosk',
    orderServiceType: 'DeliveryByClient',
    items,
    combos,
    discountsInfo: null,
    tableNumber,
    terminalGroupId: terminalId,
  };

  // Total 0 (fully covered) → omit payments, per the QR flow spec.
  if (payment && Number(total) > 0) {
    order.payments = [payment];
  }

  return {
    clientCode,
    organizationId,
    deliveryTerminalId: terminalId,
    order,
    coupon: null,
    source: 'web',
    notes: buildDeviceNotes(version),
    loyaltyInfo: null,
    'cf-turnstile-response': turnstileToken || '',
  };
}

/**
 * Build a single OrderPayment from a selected terminal payment type.
 * @param {object} paymentType - entry from terminal.paymentTypes
 * @param {number} total
 * @returns {object|null}
 */
export function buildOrderPayment(paymentType, total) {
  const obj = paymentType?.object;
  if (!obj) return null;
  return {
    sum: Math.round(Number(total) || 0),
    paymentTypeId: obj.paymentTypeId,
    code: obj.code,
    paymentTypeKind: obj.paymentTypeKind,
    ...(obj.isProcessedExternally ? { isProcessedExternally: true } : {}),
  };
}

/**
 * Extract a human order number from the POST /table-orders/add response,
 * falling back to the iiko id when no numeric order number is present.
 * @param {object} response
 * @returns {string|number|null}
 */
export function extractOrderNumber(response) {
  const data = response?.data;
  const orderSnapshot = data?.order;
  const number =
    orderSnapshot?.number ??
    orderSnapshot?.order?.number ??
    data?.number ??
    null;
  if (number != null) return number;
  return data?.iiko ?? null;
}
