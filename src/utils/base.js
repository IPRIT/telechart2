/**
 * @param {*} object
 * @param {Function} fn
 */
export function objectEachKey (object, fn = () => {}) {
  Object.keys( object ).forEach( fn );
}

/**
 * @param {*} object
 * @param {Function} fn
 * @return {*[]}
 */
export function objectMapKey (object, fn = () => {}) {
  return Object.keys( object ).map( fn );
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
 * @param {*} value
 * @returns {boolean}
 */
export function isObject (value) {
  return typeof value === 'object' && value !== null;
}

/**
 * @param {Date|*} value
 * @return {boolean}
 */
export function isDate (value) {
  return value instanceof Date && !isNaN( value.valueOf() );
}
