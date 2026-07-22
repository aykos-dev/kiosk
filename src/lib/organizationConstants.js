/** City used for kiosk organization / payment-type lookup. */
export const DEFAULT_KIOSK_CITY_ID = '41d99206-638b-47b9-8338-95892c28ac41';

/** Default venue; payment types are read from this org’s first terminal. */
export const DEFAULT_KIOSK_ORGANIZATION_ID = '6a5de0f5-925d-4d30-8871-ec1f56cc32b9';

/**
 * Fallback organization id for table-order creation, used only when the
 * organizations fetch yields no usable organization/terminal.
 */
export const FALLBACK_TABLE_ORDER_ORGANIZATION_ID = '3145fbac-4aa5-4704-8769-659f8ee470e1';

/**
 * Fallback delivery terminal / terminal group id for table-order creation,
 * used only when the resolved organization exposes no terminal.
 */
export const FALLBACK_TABLE_ORDER_TERMINAL_ID = '429ce4f0-abea-42f1-9be8-9160e9c2bdec';
