# QR Menu (Table / Mobile‑Kiosk) Ordering Flow

This document describes the full ordering flow for the **QR menu** experience — the version of the
site a guest reaches after scanning a QR code placed on a restaurant table. In this codebase the
QR‑menu is internally called the **"mobile kiosk"** / **"table order"** flow (`WebsiteVersions.KIOSK`).

It documents every API call involved, with the exact **HTTP method**, **URL**, **request body / params**,
and **response type** so the flow can be re‑implemented in another project.

---

## 1. High‑level flow

```
QR code  ─►  /mobile-kiosk?id={organizationId}&tableNumber={n}   (splash page)
              │
              │  1. GET /table-orders/organizations/{id}          → organization + terminals + paymentTypes
              │  2. Generate a client "code" (sha3_224) locally, store table number
              ▼
           Menu screen
              │
              │  3. GET /v3.1/menu                                → full product catalog (Category[])
              ▼
           Cart / Review screen
              │
              │  4. Pick payment type (taken from terminal.paymentTypes)
              │  5. POST /table-orders/add                        → create the order
              ▼
           Status screen  (/mobile-kiosk/status)
              │
              │  6a. GET /table-orders/{code}                     → latest order for this client code
              │  6b. GET /table-orders/{code}/all                 → all orders for this client code
              │  6c. GET /table-orders/{code}/status              → single order status
              │  6d. GET /table-orders/{id}                       → order by internal id
              │  6e. POST /table-orders/by-iiko-id                → order by iiko id
              │   7. POST /table-orders/review                    → leave feedback
```

### Base URL

All endpoints below are relative to the API base URL:

```
DOMAIN_API = process.env.NEXT_PUBLIC_API_URL      // e.g. https://devio.bellissimo.uz/api
```

The menu endpoint (`/v3.1/menu`) is served from the same host. The `table-orders/*` endpoints
sit directly under `DOMAIN_API`.

### Authorization

The order‑creation call sends a Bearer token **only if one exists** (guest ordering is allowed):

```
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}        // optional — omitted for anonymous guests
```

All the GET status endpoints are unauthenticated.

---

## 2. Entry point — resolving the organization from the QR code

The QR code encodes the URL `/mobile-kiosk?id={organizationId}&tableNumber={tableNumber}`.
On load, the splash page fetches the organization the terminal belongs to.

### `GET /table-orders/organizations/{id}`

- **Method:** `GET`
- **Path param:** `id` — the organization id embedded in the QR code.
- **Auth:** none.

**Response**

```ts
{
  data: KioskOrganization
}

interface KioskOrganization extends Organization {
  selectedCityId: string          // city this organization belongs to
}

interface Organization {
  id: string
  name: string
  restaurantAddress: string
  terminals: Terminal[]           // usually the first terminal is used: terminals[0]
  openTime: string
  closeTime: string
  couponCode: string | null       // optional auto-applied QR coupon
  couponPercentage: number | null // discount % for that coupon
}

interface Terminal {
  id: string                      // used as deliveryTerminalId AND terminalGroupId when ordering
  organizationId: string
  name: string
  dayFrom: string
  dayTo: string
  nightFrom: string
  nightTo: string
  paymentTypes: PaymentTypes[]    // ⭐ the list of allowed payment methods (see §4)
  isAvailableForDelivery: boolean
  isAvailableForPickUp: boolean
  reasonMessage: TranslationTitle
  title: TranslationTitle | []
  desc: TranslationTitle | []
  longitude: number
  latitude: number
  wifi: boolean
  childrenZone: number
  attendance: number
  zone: [number, number][]
  translations: {
    title: TranslationTitle | []
    desc: TranslationTitle | []
  }
}

interface TranslationTitle {
  ru?: string
  uz?: string
  kz?: string
}
```

**What the client does with the response**

1. Selects the city (`selectedCityId` → matched against the cities list).
2. Marks the session as KIOSK: `deliveryType = 2`, `websiteVersion = KIOSK`.
3. Stores `terminals[0]` as the selected terminal (its `id` is the `deliveryTerminalId` /
   `terminalGroupId`, and its `paymentTypes` drive the payment UI).
4. Stores `organization.id` as the `selectedOrganizationId`.
5. Generates and caches a **client code** (this identifies the guest/table session; there is no login):

```ts
import {sha3_224} from "js-sha3"

const timestamps = Date.now()
const code = sha3_224(organization.id + timestamps)   // stable per session (~1h)

kioskClientData = {
  timestamps,
  code,                                  // ⭐ used in POST /table-orders/add and all status calls
  tableNumber,                           // from the QR query string
  couponCode: data.data.couponCode,
  couponPercentage: -Number(data.data.couponPercentage)
}
```

> The `code` is regenerated only if none exists or the previous one is older than 1 hour
> (`timestampDiff > 3600000`). Otherwise the existing code is reused so a guest keeps the
> same session across page reloads.

---

## 3. Fetching the menu

The QR menu uses the same catalog endpoint as the main site.

### `GET /v3.1/menu`

- **Method:** `GET`
- **Params:** none.
- **Auth:** none.
- **Caching:** requested with `cache: "no-store"`.

**Response**

```ts
type Response = Category[]

interface Category {
  id: string
  name: string
  icon: string
  menuType: string                 // e.g. "pizza", "toppings", "crusts" ...
  translations: Translations
  price: null
  image: null
  products: Product[]              // simple products (single price)
  groups: Group[]                  // products with sizes (e.g. pizza sizes)
}

interface Product {
  id: string
  name: string
  code: string
  parentGroup: string
  type: string
  orderItemType: string
  price: number
  extraCostInCombo?: number
  isHiddenForQRWebsite: boolean    // ⭐ hide this product when rendering the QR menu
  productId: string                // ⭐ iiko product id — used in the order payload
  translations: Translations
  image: string
  order: number
  crusts: Crust
  toppings: Topping | null
  borts?: Crust | null
  halfs: null
  defaultUtensilsCount: number
  maxAllowedUtensilsCount: number
}

interface Group {
  id: string
  name: string
  icon: null
  menuType: null
  translations: Translations
  price: number
  image: string
  products: ProductSize[]          // the individual sizes
}

interface ProductSize {
  id: string
  name: string
  order: number
  code: string
  parentGroup: string
  type: string
  extraCostInCombo?: number
  orderItemType: string
  price: number
  productId: string                // iiko product id
  translations: Translations
  image: string
  tags?: string[] | null
  crusts: Crust
  borts?: Crust | null
  selectBort?: CrustProduct
  toppings: Topping | null
  halfs: ConstructorHalf["halfs"] | null
  maxAllowedUtensilsCount: number
  defaultUtensilsCount: number
}

interface Topping {
  id: string
  name: string
  icon: null
  menuType: "toppings"
  translations: Translations
  price: number
  image: null
  products: ToppingProduct[]
  maxAmount: number | null
  minAmount: number | null
  defaultProductId: string | null
  freeOfChargeAmount: number | null
  required: boolean
}

interface Crust {
  defaultProductId: string | null
  id: string
  name: string
  icon: null
  menuType: "crusts"
  translations: Translations
  price: number
  image: null
  products: CrustProduct[]
}

interface Translations {
  title: TranslationTitle
  desc: TranslationTitle
}
```

> When rendering the QR menu, filter out products where `isHiddenForQRWebsite === true`.

---

## 4. Payment types

There is **no separate endpoint** for payment types in the QR flow. They come embedded inside the
terminal returned by `GET /table-orders/organizations/{id}` (§2):

```ts
selectedTerminal.paymentTypes   // PaymentTypes[]
```

**Type**

```ts
interface PaymentTypes {
  button?: string
  id: number                       // local id used to select the option in the UI
  label: TranslationTitle
  icon: string
  object: PaymentTypesObject       // ⭐ the part sent to the order API
}

interface PaymentTypesObject {
  paymentTypeId: string            // iiko payment type id
  code: string                     // e.g. "CASH", "PAYME"
  paymentTypeKind: string          // e.g. "Cash", "Card"
  isProcessedExternally?: true     // true for online gateways that redirect (e.g. Payme)
}
```

**QR‑specific rule:** if the QR menu is configured as cash‑only, the UI filters the list to `Cash`
only:

```ts
paymentTypes.filter(p => p.object.paymentTypeKind === "Cash")
```

The `qrMenuOnlyCash` flag comes from the global settings / feature‑flag payload — an `extraFields`
entry named `qr_menu_only_cash`:

```ts
const qrMenuOnlyCash =
  settings?.extraFields?.find(f => f.name === "qr_menu_only_cash")?.value === true
```

> The terminal’s `paymentTypes` list is also available from the generic cities endpoint
> (`GET /v2/cities/` → `City[] → organization[] → terminals[] → paymentTypes`), which is the same
> data the QR organization endpoint returns.

When the user picks a payment method, the client builds a single `OrderPayment` entry from the
selected `object`, with `sum` = order total (after discounts / kiosk coupon):

```ts
const payments: OrderPayment[] = [
  {
    sum: totalPrice
       - (discount?.summa || 0)
       + (isKiosk && kioskCouponPercentage ? totalPrice * (kioskCouponPercentage / 100) : 0),
    paymentTypeId: selected.object.paymentTypeId,
    code: selected.object.code,
    paymentTypeKind: selected.object.paymentTypeKind
  }
]

interface OrderPayment {
  sum: number
  paymentTypeId: string
  code: string                     // "PAYME", "CASH", ...
  paymentTypeKind: string          // "Card", "Cash", ...
  isProcessedExternally?: boolean
}
```

> If the total is `0` (fully covered by coupon), the `payments` array is omitted from the request.

---

## 5. Creating the order

### `POST /table-orders/add`

- **Method:** `POST`
- **Auth:** Bearer token if available (optional for guests).
- **Headers:** `Accept: application/json`, `Content-Type: application/json`.

**Request body** (`CreateTableOrderRequestType`)

```ts
interface CreateTableOrderRequestType {
  clientCode: string               // ⭐ the sha3_224 code generated on the splash page
  organizationId: string           // selected organization id
  deliveryTerminalId: string       // selectedTerminal.id
  order: {
    completeBefore: string | null  // "YYYY-MM-DD HH:mm:ss.SSS" or null for ASAP
    deliveryPoint: null            // always null for table orders (dine-in)
    comment: string | null         // user comment + change note + " Stol - {tableNumber}"
    sourceKey: "kiosk"             // ⭐ constant for QR/table orders
    orderServiceType: "DeliveryByClient"   // ⭐ dine-in / self-service
    items: OrderProduct[]
    combos: OrderCombo[]
    payments?: OrderPayment[]      // omitted when totalPrice === 0
    discountsInfo: null
    tableNumber: number | null     // parsed table number from the QR code
    terminalGroupId: string        // == deliveryTerminalId (selectedTerminal.id)
  }
  coupon: string | null
  source: "web.mobile" | "web"     // "web.mobile" on mobile devices
  notes: {
    build: "1"
    version: string                // app version (from package.json)
    device: {
      brand: string
      manufacturer: string
      modelName: string
      year: number
      memory: number
      os: string
      osVersion: string
    }
  }
  utensilsCount?: number
  b2bId?: string                   // undefined for QR flow
  "cf-turnstile-response": string  // Cloudflare Turnstile captcha token
  loyaltyInfo: null
}

interface OrderProduct {
  productId: string                // iiko product id (from the menu)
  name: string
  type: "Product"
  amount: number
  positionId: string | null        // set when part of a combo
  price: number
  modifiers: OrderProductModifier[]
  comboInformation: ComboInformation | null
}

interface OrderProductModifier {
  productId: string                // modifier product id
  amount: number
  productGroupId: string           // modifier group id
  price: number
  positionId?: string              // present if inside a combo
}

interface OrderCombo {
  id: string
  name: string
  amount: number
  price: number
  sourceId: string
}
```

**Example request body**

```json
{
  "clientCode": "8f2c...e91",
  "organizationId": "0f1e2d3c-...",
  "deliveryTerminalId": "a1b2c3d4-...",
  "order": {
    "completeBefore": null,
    "deliveryPoint": null,
    "comment": "No onions  Stol - 12",
    "sourceKey": "kiosk",
    "orderServiceType": "DeliveryByClient",
    "items": [
      {
        "productId": "9c8b7a6d-...",
        "name": "Pepperoni (L)",
        "type": "Product",
        "amount": 1,
        "positionId": null,
        "price": 79000,
        "modifiers": [],
        "comboInformation": null
      }
    ],
    "combos": [],
    "payments": [
      {
        "sum": 79000,
        "paymentTypeId": "09322f46-578a-d210-add7-eec222a08871",
        "code": "CASH",
        "paymentTypeKind": "Cash"
      }
    ],
    "discountsInfo": null,
    "tableNumber": 12,
    "terminalGroupId": "a1b2c3d4-..."
  },
  "coupon": null,
  "source": "web.mobile",
  "notes": {
    "build": "1",
    "version": "0.1.0",
    "device": {
      "brand": "Chrome",
      "manufacturer": "126.0",
      "modelName": "WebKit",
      "year": 2019,
      "memory": 4045406208,
      "os": "iOS",
      "osVersion": "17.5"
    }
  },
  "utensilsCount": 2,
  "cf-turnstile-response": "0.abc...",
  "loyaltyInfo": null
}
```

**Response** (`ReturnedType`)

```ts
{
  success: boolean
  message: {
    ru: string
    uz: string
  }
  errorType: number
  data: {
    iiko: string                   // iiko order id
    order?: {
      // ...order snapshot; the important field for redirect payments:
      payments: {
        sum: number
        paymentTypeId: string
        code: string               // "CASH" | "PAYME" | ...
        paymentTypeKind: string    // "Cash" | "Card"
        url: string | null         // ⭐ redirect URL for online payment gateways
        isOpenInIframe: boolean
      }[]
    }
  } | null
  reasonMessage: {
    description: {
      ru: string
      uz: string
    }
  } | null
}
```

**Post‑order handling**

```ts
if (data.success) {
  if (data.data.order?.payments[0].url) {
    // online payment → redirect the guest to the gateway
    window.location.href = data.data.order.payments[0].url
  } else {
    // cash / no redirect → go to the status screen
    router.push("/mobile-kiosk/status")
  }
}
```

---

## 6. Order status

All status endpoints are `GET` (except *by‑iiko‑id*) and unauthenticated. `{code}` is the
`clientCode` generated on the splash page; `{id}` is the internal order id.

| Purpose | Method | Path | Returns |
|---|---|---|---|
| Latest order for this session | `GET` | `/table-orders/{code}` | `OrderStatus["order"]` |
| Single order status | `GET` | `/table-orders/{code}/status` | `{ data: TableOrder }` |
| All orders for this session | `GET` | `/table-orders/{code}/all` | `{ data: TableOrder[] }` |
| Order by internal id | `GET` | `/table-orders/{id}` | `{ data: TableOrder }` |
| Order by iiko id | `POST` | `/table-orders/by-iiko-id` | `{ success, message, data: TableOrder }` |

### `POST /table-orders/by-iiko-id`

**Request body**

```ts
{
  organizationId: string
  iikoId: string
}
```

**Response**

```ts
{
  success: boolean
  message: string
  data: TableOrder
}
```

### Status types

```ts
type TableOrderStatusType = "New" | "Bill" | "Closed" | "Deleted" | "NotCreated"

// "TableOrder" shape (TableOrderObj):
interface TableOrder {
  id: number
  iikoId: string
  customerName: string
  address: string | null
  status: TableOrderStatusType
  completeBefore: string
  whenCreated: string
  whenDelivered: string
  deliveryDuration: number
  organizationName: string | null
  organizationId?: string
  sum: number
  number: number
  whenClosed: string
  createdAt: string
  items: OrderStatusItem[]
  orderType: "DeliveryByCourier" | "DeliveryByClient" | "Common"
  deliveryFee?: number
  paymentUrl: string               // ⭐ URL to pay the bill (online)
  paymentText: string
}

interface OrderStatusItem {
  name: string
  id: string
  modifiers: { name: string; id: string; amount: number; price: number }[]
  price: number
  amount: number
}

// Full status envelope returned by GET /table-orders/{code}:
interface TableOrderStatus {
  order: {
    id: string
    creationStatus: "Success" | "InProgress" | "Error"
    order: TableOrder
    organizationId: string
    timestamp: string
    updated_at: string
    coords: [string, string]
    time: string
    lasting: number
    lastingS: number
    cookLasting: number
    waitTime: number
    closingTime: number
  }
}
```

---

## 7. Feedback / review

There are two feedback endpoints available to the QR flow:

### `POST /table-orders/review`

- **Method:** `POST`
- **Body:** `FeedbackRequest`
- **Response:** `FeedbackResponse`

(Reuses the shared `feedback-v2` types — `FeedbackRequest` / `FeedbackResponse`.)

### `POST /feedback/qr-code`

Simple star‑rating feedback tied to an organization.

- **Method:** `POST`
- **Body:**

```ts
{
  rating: number
  organization_id: string
  body: string
  customer_phone?: string | null
}
```

- **Response:**

```ts
{
  success: boolean
  data: number
  message: string
}
```

---

## 8. Source map (this repo)

| Concern | File |
|---|---|
| Organization fetch (RTK Query + thunk) | `features/mobile-kiosk/tableOrderApi.ts`, `features/mobile-kiosk/fetchKioskOrganizationInfo.ts` |
| Splash page (QR entry, client code generation) | `features/mobile-kiosk/MobileKioskSplashPage.tsx` |
| Menu fetch | `services/productApi.ts` (`GetProducts` → `GET /v3.1/menu`) |
| Order creation | `features/order/createTableOrder.ts` |
| Order status fetch | `features/order/fetchTableOrderStatus.ts`, `features/mobile-kiosk/tableOrderApi.ts` |
| Request / response types | `features/order/orderType.ts`, `types/city.ts`, `types/payment.ts`, `types/product.ts` |
| Payment selection & submit | `features/review/SummaryReview.tsx`, `features/review/PaymentMethod.tsx` |
| API base URL | `utils/api.ts` (`DOMAIN_API`) |

---

## 9. Minimal client checklist (for reuse in another project)

1. **Read `id` + `tableNumber`** from the QR URL.
2. **`GET /table-orders/organizations/{id}`** → keep `organization.id`, `terminals[0].id`,
   `terminals[0].paymentTypes`, `selectedCityId`, `couponCode/couponPercentage`.
3. **Generate `clientCode = sha3_224(organizationId + Date.now())`**, persist it (reuse < 1h old).
4. **`GET /v3.1/menu`** → render products, hiding `isHiddenForQRWebsite === true`.
5. Build the cart → build `items: OrderProduct[]` (use each product's `productId`).
6. Let the user choose a payment type from `terminal.paymentTypes` → build one `OrderPayment`.
7. **`POST /table-orders/add`** with `sourceKey: "kiosk"`, `orderServiceType: "DeliveryByClient"`,
   `clientCode`, `tableNumber`, `terminalGroupId = deliveryTerminalId = terminals[0].id`, and a
   Cloudflare Turnstile token.
8. If the response has `data.order.payments[0].url` → redirect to pay; otherwise show status.
9. **Poll `GET /table-orders/{clientCode}`** (or `/all`) for live status.
