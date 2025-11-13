//
// Simple debounce utility for performance-sensitive inputs.
//
/**
 * PUBLIC_INTERFACE
 * Creates a debounced function that delays invoking `fn` until after `wait` ms have
 * elapsed since the last time the debounced function was invoked.
 * @param {Function} fn - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} debounced function
 */
export function debounce(fn, wait = 250) {
  /** Debounce helper. */
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
