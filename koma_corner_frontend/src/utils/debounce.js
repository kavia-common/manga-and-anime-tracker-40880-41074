/**
 * PUBLIC_INTERFACE
 * Creates a debounced function that delays invoking `fn` until after `wait` ms have
 * elapsed since the last time the debounced function was invoked.
 * @param {Function} fn - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} debounced function
 */
export function debounce(fn, wait = Number(process.env.REACT_APP_SEARCH_DEBOUNCE_MS) || 300) {
  /** Debounce helper with configurable wait via REACT_APP_SEARCH_DEBOUNCE_MS (default 300ms). */
  let timer = null;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
