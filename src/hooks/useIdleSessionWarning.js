import { useCallback, useEffect, useRef, useState } from 'react';

const LISTENER_OPTS = { passive: true };

/** Time with no input before the idle warning appears (5 minutes). Override via `kiosk.inactivityTimeout` in config when using Electron. */
export const DEFAULT_IDLE_SESSION_MS = 5 * 60 * 1000;

/**
 * After `idleMs` without activity, opens warning phase with `countdownSeconds` countdown,
 * then calls `onExpire` (e.g. resetFlow → welcome). Activity restarts the idle timer.
 * Fixes removeEventListener by passing the same options object as addEventListener.
 */
export function useIdleSessionWarning({
  idleMs,
  countdownSeconds = 15,
  onExpire,
  enabled,
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    let left = countdownSeconds;
    setSecondsLeft(left);
    countdownIntervalRef.current = setInterval(() => {
      left -= 1;
      setSecondsLeft(left);
      if (left <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setWarningOpen(false);
        onExpireRef.current?.();
      }
    }, 1000);
  }, [countdownSeconds]);

  const scheduleIdleTimer = useCallback(() => {
    clearTimers();
    setWarningOpen(false);
    setSecondsLeft(countdownSeconds);
    if (!enabled) return;

    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      setWarningOpen(true);
      startCountdown();
    }, idleMs);
  }, [clearTimers, countdownSeconds, enabled, idleMs, startCountdown]);

  const lastThrottleRef = useRef(0);
  const onActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current < 400) return;
    lastThrottleRef.current = now;
    scheduleIdleTimer();
  }, [scheduleIdleTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setWarningOpen(false);
      return undefined;
    }
    scheduleIdleTimer();

    const events = [
      'pointerdown',
      'pointermove',
      'keydown',
      'touchstart',
      'touchmove',
      'wheel',
      'click',
    ];
    const onScroll = () => onActivity();
    events.forEach((e) => window.addEventListener(e, onActivity, LISTENER_OPTS));
    window.addEventListener('scroll', onScroll, { ...LISTENER_OPTS, capture: true });

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, LISTENER_OPTS));
      window.removeEventListener('scroll', onScroll, { ...LISTENER_OPTS, capture: true });
      clearTimers();
    };
  }, [enabled, onActivity, scheduleIdleTimer, clearTimers]);

  const staySession = useCallback(() => {
    scheduleIdleTimer();
  }, [scheduleIdleTimer]);

  return {
    warningOpen,
    secondsLeft,
    staySession,
  };
}
