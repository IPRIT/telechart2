/**
 * @param {*} object
 * @param {Function} fn
 */
export function objectEachKey (object, fn = () => {}) {
  Object.keys( object ).forEach( fn );
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export function clampNumber (value, min = -Infinity, max = Infinity) {
  if (min > max) {
    [ min, max ] = [ max, min ];
  }

  if (value > max) {
    value = max;
  }

  if (value < min) {
    value = min;
  }

  return value;
}

/**
 * @param {*} value
 * @return {number}
 */
export function ensureNumber (value) {
  value = Number(value);
  if (Number.isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * @param {Date|*} value
 * @return {boolean}
 */
export function isDate (value) {
  return value instanceof Date && !isNaN( value.valueOf() );
}

/**
 * @param {Function} fn
 * @param {number} delayMs
 * @return {wrapper}
 */
export function throttle (fn, delayMs) {
  let isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper () {
    if (isThrottled) {
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    fn.apply(this, arguments);

    isThrottled = true;

    setTimeout(_ => {
      isThrottled = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, delayMs);
  }

  return wrapper;
}

/**
 * @param {Function} fn
 * @param {number} time
 * @return {Function}
 */
export function debounce (fn, time) {
  let timeout;

  return function () {
    const fnc = () => fn.apply( this, arguments );

    clearTimeout(timeout);
    timeout = setTimeout(fnc, time);
  }
}
