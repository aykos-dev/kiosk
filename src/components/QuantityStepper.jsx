import { useI18n } from '../hooks/useI18n.js';
import { IconMinus, IconPlus } from './icons.jsx';

/**
 * Shared "minus | value | plus" stepper pill.
 *
 * The caller owns the pill's size/background (via `className`) and the
 * zero-quantity state (e.g. showing an "Add" button instead of the stepper).
 * Callbacks are pre-bound by the caller, so the same control drives lineId-,
 * productId-, and delta-based carts alike.
 *
 * @param {object} props
 * @param {number} props.value - current quantity
 * @param {() => void} props.onDecrement
 * @param {() => void} props.onIncrement
 * @param {string} [props.className] - pill layout: height / width / background
 * @param {string} [props.valueClassName] - number cell (min-width, font-size, tabular-nums…)
 * @param {string} [props.iconClassName] - +/- icon size
 * @param {boolean} [props.animateValue] - re-trigger the qty pop animation on change
 * @param {boolean} [props.incrementDisabled] - disable the plus button (e.g. at a max cap)
 * @param {string} [props.decreaseLabel] - aria-label override for the minus button
 * @param {string} [props.increaseLabel] - aria-label override for the plus button
 */
export function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  className = 'h-11 bg-surface',
  valueClassName = 'min-w-[2ch] text-[15px]',
  iconClassName = 'h-5 w-5',
  animateValue = false,
  incrementDisabled = false,
  decreaseLabel,
  increaseLabel,
}) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center rounded-full ${className}`}>
      <button
        type="button"
        className="flex h-full flex-1 items-center justify-center rounded-l-full transition active:bg-black/5"
        onClick={onDecrement}
        aria-label={decreaseLabel ?? t('common.decrease')}
      >
        <IconMinus className={iconClassName} />
      </button>
      <span
        key={animateValue ? value : undefined}
        className={`text-center font-semibold text-ink ${valueClassName} ${
          animateValue ? 'motion-safe:animate-kiosk-qty' : ''
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        disabled={incrementDisabled}
        className="flex h-full flex-1 items-center justify-center rounded-r-full transition active:bg-black/5 disabled:opacity-40 disabled:active:bg-transparent"
        onClick={onIncrement}
        aria-label={increaseLabel ?? t('common.increase')}
      >
        <IconPlus className={iconClassName} />
      </button>
    </div>
  );
}
