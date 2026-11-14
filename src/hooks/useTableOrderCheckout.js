import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import pkg from '../../package.json';
import { createTableOrder } from '../api/tableOrders.js';
import { getOrganizationsQueryOptions } from '../api/organizations.js';
import { useKioskSettingsStore } from '../store/kioskSettingsStore.js';
import {
  buildOrderPayment,
  buildTableOrderPayload,
  extractOrderNumber,
  extractPaymentUrl,
  generateClientCode,
  resolveKioskOrderTarget,
} from '../lib/tableOrder.js';
import { paymentVisualKind } from '../lib/paymentTypeVisual.js';
import { cartToReceiptItems } from '../lib/receiptItems.js';

/** Local order number for test-payment receipts (never sent to the backend). */
function testOrderNumber() {
  return `T-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

/**
 * Table-order checkout: from the payment picker, build the POST /table-orders/add
 * body and submit it. On success the server order number is shown; on failure the
 * guest is returned to the cart with a localized error.
 */
export function useTableOrderCheckout({
  cart,
  total,
  clearCart,
  setLastError,
  setOrderNumber,
  setScreen,
  screen,
  t,
  locale,
}) {
  const [paymentStep, setPaymentStep] = useState('select');
  /** { url, kind } for online gateways that return a redirect URL to scan. */
  const [paymentQr, setPaymentQr] = useState(null);
  const submittingRef = useRef(false);

  const cityId = useKioskSettingsStore((s) => s.cityId);
  const organizationId = useKioskSettingsStore((s) => s.organizationId);
  const { data: organizations = [] } = useQuery(getOrganizationsQueryOptions(cityId));

  // Leaving the payment flow always resets to the picker.
  useEffect(() => {
    if (screen !== 'payment') setPaymentStep('select');
  }, [screen]);

  const openPayment = useCallback(() => {
    setLastError(null);
    setPaymentQr(null);
    setScreen('payment');
    setPaymentStep('select');
  }, [setLastError, setScreen]);

  const onPaymentBack = useCallback(() => {
    setScreen('cart');
    setPaymentStep('select');
  }, [setScreen]);

  const localizedMessage = useCallback(
    (msg) => {
      if (!msg) return null;
      if (typeof msg === 'string') return msg;
      return msg[locale] || msg.uz || msg.ru || null;
    },
    [locale],
  );

  /**
   * @param {object} paymentType - selected entry from terminal.paymentTypes, or
   *   a static card descriptor `{ static, cardKind, apiPaymentType }` for the
   *   Humo/Uzcard buttons (which charge a physical terminal via Electron IPC).
   */
  const submit = useCallback(
    async (paymentType) => {
      if (submittingRef.current) return;
      if (!cart.length) return;
      submittingRef.current = true;
      setLastError(null);
      setPaymentStep('processing');

      const kiosk = typeof window !== 'undefined' ? window.kiosk : undefined;
      const cardKind = paymentType?.static ? paymentType.cardKind : null;

      try {
        // Test payment: no card terminal, no backend order — just print the
        // receipt (marked NOT PAID) so the printer layout can be checked.
        if (paymentType?.test) {
          const orderNo = testOrderNumber();
          if (!kiosk?.printReceipt) {
            setLastError(t('errors.kioskBridge') || t('errors.generic'));
            setPaymentStep('select');
            return;
          }
          const printed = await kiosk.printReceipt({
            orderNumber: orderNo,
            items: cartToReceiptItems(cart),
            total,
            paymentMethod: 'test',
            testMode: true,
          });
          if (!printed?.ok) {
            setLastError(printed?.message || t('errors.generic'));
            setPaymentStep('select');
            return;
          }
          setOrderNumber(orderNo);
          clearCart();
          setScreen('success');
          setPaymentStep('select');
          return;
        }

        // Card (Humo/Uzcard): charge the matching physical terminal FIRST, so we
        // only ever register a paid order. No money moves until the terminal
        // approves; a decline/error returns the guest to the picker.
        let cardTxn = null;
        if (cardKind) {
          if (!kiosk?.chargeCard) {
            setLastError(t('errors.kioskBridge') || t('errors.generic'));
            setPaymentStep('select');
            return;
          }
          const charge = await kiosk.chargeCard(cardKind, total);
          if (charge?.status !== 'approved') {
            setLastError(
              charge?.status === 'declined'
                ? t('errors.paymentDeclined')
                : charge?.message || t('errors.paymentFailed'),
            );
            setPaymentStep('select');
            return;
          }
          cardTxn = charge.transactionId || null;
        }

        const { organizationId: orgId, terminalId } = resolveKioskOrderTarget(
          organizations,
          organizationId,
        );
        // For static card buttons, register the order under the API's card
        // payment type (the backend doesn't distinguish Humo vs Uzcard).
        const orderPaymentType = cardKind ? paymentType.apiPaymentType || paymentType : paymentType;
        const payload = buildTableOrderPayload({
          cart,
          clientCode: generateClientCode(),
          organizationId: orgId,
          terminalId,
          total,
          payment: buildOrderPayment(orderPaymentType, total),
          tableNumber: null,
          comment: null,
          version: pkg.version,
        });

        const res = await createTableOrder(payload);

        if (res?.success) {
          const orderNo = extractOrderNumber(res);
          setOrderNumber(orderNo);
          // Print a receipt for EVERY successful order (card, cash, QR/online).
          // Best-effort: a printer fault is recorded in main and shown via the
          // hardware-error toast; it never blocks the order.
          if (kiosk?.printReceipt) {
            kiosk
              .printReceipt({
                orderNumber: orderNo,
                items: cartToReceiptItems(cart),
                total,
                transactionId: cardTxn,
                paymentMethod: cardKind || paymentVisualKind(paymentType?.object?.code),
              })
              .catch(() => {});
          }
          clearCart();
          const url = extractPaymentUrl(res);
          if (url) {
            // Online gateway (Payme/Click/Uzum): show a QR of the pay URL with
            // the chosen provider's logo centered; stay on the payment screen.
            setPaymentQr({ url, kind: paymentVisualKind(paymentType?.object?.code) });
            setPaymentStep('qr');
          } else {
            setScreen('success');
            setPaymentStep('select');
          }
        } else if (cardTxn) {
          // Money was captured on the terminal but the backend rejected the
          // order. Do NOT bounce as if nothing happened — print a proof receipt
          // with the txn id and tell the guest to get staff (manual reconcile).
          if (kiosk?.printReceipt) {
            kiosk
              .printReceipt({
                orderNumber: '—',
                items: cartToReceiptItems(cart),
                total,
                transactionId: cardTxn,
                paymentMethod: cardKind,
              })
              .catch(() => {});
          }
          setLastError(t('errors.paymentCapturedNoOrder'));
          setPaymentStep('select');
        } else {
          const reason =
            localizedMessage(res?.reasonMessage?.description) ||
            localizedMessage(res?.message) ||
            t('errors.paymentFailed');
          // Stay on the payment picker so the guest can retry; error is shown inline.
          setLastError(reason);
          setPaymentStep('select');
        }
      } catch (e) {
        setLastError(e?.message || t('errors.generic'));
        setPaymentStep('select');
      } finally {
        submittingRef.current = false;
      }
    },
    [
      cart,
      total,
      organizations,
      organizationId,
      clearCart,
      setLastError,
      setOrderNumber,
      setScreen,
      localizedMessage,
      t,
    ],
  );

  return {
    paymentStep,
    paymentQr,
    openPayment,
    onPaymentBack,
    submit,
  };
}
