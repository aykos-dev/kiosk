import { useCallback, useEffect, useRef, useState } from 'react';

/** Stay on QR / processing after payment succeeds, then show order number screen. */
const POST_CHECKOUT_SUCCESS_DELAY_MS = 30_000;

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

  const runCheckout = useCallback(async () => {
    if (!kiosk) {
      setLastError(t('errors.kioskBridge'));
      setScreen('cart');
      setPaymentStep('select');
      return;
    }
    setLastError(null);
    try {
      const res = await kiosk.processCheckout({ items: cart, total });
      if (checkoutCancelledRef.current) return;
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
  }, [kiosk, cart, total, clearCart, setLastError, setOrderNumber, setScreen, t]);

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

  const onSelectQr = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('qr');
    void runCheckout();
  }, [runCheckout]);

  const onSelectHumo = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('processing');
    void runCheckout();
  }, [runCheckout]);

  /** Cash / terminal without QR scan — same processing path until kiosk differentiates. */
  const onSelectCash = useCallback(() => {
    checkoutCancelledRef.current = false;
    setPaymentStep('processing');
    void runCheckout();
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
