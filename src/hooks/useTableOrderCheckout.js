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
  generateClientCode,
  resolveKioskOrderTarget,
} from '../lib/tableOrder.js';

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
   * @param {object} paymentType - selected entry from terminal.paymentTypes
   */
  const submit = useCallback(
    async (paymentType) => {
      if (submittingRef.current) return;
      if (!cart.length) return;
      submittingRef.current = true;
      setLastError(null);
      setPaymentStep('processing');

      try {
        const { organizationId: orgId, terminalId } = resolveKioskOrderTarget(
          organizations,
          organizationId,
        );
        const payload = buildTableOrderPayload({
          cart,
          clientCode: generateClientCode(),
          organizationId: orgId,
          terminalId,
          total,
          payment: buildOrderPayment(paymentType, total),
          tableNumber: null,
          comment: null,
          version: pkg.version,
        });

        const res = await createTableOrder(payload);

        if (res?.success) {
          setOrderNumber(extractOrderNumber(res));
          clearCart();
          setScreen('success');
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
    openPayment,
    onPaymentBack,
    submit,
  };
}
