import { useCallback, useEffect, useRef, useState } from 'react';

/** Stay on QR / processing after payment succeeds, then show order number screen. */
const POST_CHECKOUT_SUCCESS_DELAY_MS = 30_000;

/** Methods that charge the card terminal vs. those settled out-of-band. */
const METHOD_CARD = 'card';
const METHOD_QR = 'qr';
const METHOD_CASH = 'cash';

function newCheckoutId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useKioskPayment({
  cart,
  total,
  clearCart,
  setLastError,
  setOrderNumber,
  setScreen,
  screen,
  t,
}) {
  const [paymentStep, setPaymentStep] = useState('select');
  const checkoutCancelledRef = useRef(false);
  const successDelayTimeoutRef = useRef(null);
  /** Stable idempotency key for the whole payment session (survives method switches). */
  const checkoutIdRef = useRef(null);

  const kiosk = typeof window !== 'undefined' ? window.kiosk : undefined;

  useEffect(
    () => () => {
      if (successDelayTimeoutRef.current != null) {
        clearTimeout(successDelayTimeoutRef.current);
        successDelayTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!kiosk) return undefined;
    const onOnline = () => kiosk.setOnline(true);
    const onOffline = () => kiosk.setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    kiosk.setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [kiosk]);

  useEffect(() => {
    if (screen !== 'payment') setPaymentStep('select');
  }, [screen]);

  const runCheckout = useCallback(
    async (method) => {
      if (!kiosk) {
        setLastError(t('errors.kioskBridge'));
        setScreen('cart');
        setPaymentStep('select');
        return;
      }
      if (!checkoutIdRef.current) checkoutIdRef.current = newCheckoutId();
      setLastError(null);
      try {
        const res = await kiosk.processCheckout({
          items: cart,
          total,
          method,
          orderId: checkoutIdRef.current,
        });
        // (2.2) A completed charge must NEVER be discarded, even if the user
        // navigated away — the money already moved. Only unbilled outcomes
        // (pending record-only, declines, errors) may be silently abandoned.
        const charged = res.ok && res.paymentStatus === 'completed';
        if (checkoutCancelledRef.current && !charged) return;

        if (res.ok) {
          setOrderNumber(res.orderNumber);
          clearCart();
          if (successDelayTimeoutRef.current != null) {
            clearTimeout(successDelayTimeoutRef.current);
          }
          successDelayTimeoutRef.current = setTimeout(() => {
            successDelayTimeoutRef.current = null;
            setScreen('success');
            setPaymentStep('select');
          }, POST_CHECKOUT_SUCCESS_DELAY_MS);
        } else if (res.reason === 'declined') {
          setLastError(t('errors.paymentDeclined'));
          setScreen('cart');
          setPaymentStep('select');
        } else {
          setLastError(res.message || t('errors.paymentFailed'));
          setScreen('cart');
          setPaymentStep('select');
        }
      } catch (e) {
        if (!checkoutCancelledRef.current) {
          setLastError(e?.message || t('errors.generic'));
          setScreen('cart');
          setPaymentStep('select');
        }
      }
    },
    [kiosk, cart, total, clearCart, setLastError, setOrderNumber, setScreen, t],
  );

  const openPayment = useCallback(() => {
    if (!kiosk) {
      setLastError(t('errors.kioskBridge'));
      return;
    }
    if (successDelayTimeoutRef.current != null) {
      clearTimeout(successDelayTimeoutRef.current);
      successDelayTimeoutRef.current = null;
    }
    checkoutCancelledRef.current = false;
    // Fresh idempotency key per cart checkout; reused across method switches
    // within this payment session so switching method never duplicates orders.
    checkoutIdRef.current = newCheckoutId();
    setScreen('payment');
    setPaymentStep('select');
    setLastError(null);
  }, [kiosk, setLastError, setScreen, t]);

  const onPaymentBack = useCallback(() => {
    checkoutCancelledRef.current = true;
    if (successDelayTimeoutRef.current != null) {
      clearTimeout(successDelayTimeoutRef.current);
      successDelayTimeoutRef.current = null;
      setOrderNumber(null);
    }
    setScreen('cart');
    setPaymentStep('select');
  }, [setOrderNumber, setScreen]);

  // QR: settled externally (Payme/Click/Uzum). Record as pending; no card charge.
  const onSelectQr = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('qr');
    void runCheckout(METHOD_QR);
  }, [runCheckout]);

  // Humo/Uzcard: charge the physical card terminal.
  const onSelectHumo = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('processing');
    void runCheckout(METHOD_CARD);
  }, [runCheckout]);

  // Cash: collected at the counter. Record as pending; no card charge.
  const onSelectCash = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('processing');
    void runCheckout(METHOD_CASH);
  }, [runCheckout]);

  return {
    paymentStep,
    openPayment,
    onPaymentBack,
    onSelectQr,
    onSelectHumo,
    onSelectCash,
  };
}
