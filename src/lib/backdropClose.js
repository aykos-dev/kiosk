/**
 * onClick handler for a modal backdrop: fires `handler` only when the click
 * lands on the backdrop itself (not on the dialog content bubbling up), so
 * clicking outside a modal closes it while clicks inside are ignored.
 * @param {() => void} [handler]
 */
export function backdropClose(handler) {
  return (e) => {
    if (e.target === e.currentTarget) handler?.();
  };
}
