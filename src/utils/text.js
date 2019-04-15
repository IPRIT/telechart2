/**
 * Number.prototype.format(n, x, s, c)
 *
 * @param {number} n - length of decimal
 * @param {number} x - length of whole part
 * @param {string} s - sections delimiter
 * @param {string} c - decimal delimiter
 */
Number.prototype.format = function(n = 0, x = 3, s = ' ', c = '.') {
  const re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')';
  const num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ' '));
};

/**
 * @param {Object} styleObject
 * @returns {string}
 */
export function cssText (styleObject = {}) {
  return Object.keys( styleObject ).reduce((css, prop) => {
    return `${css ? css + ' ' : ''}${camelToKebabCase( prop )}: ${styleObject[ prop ]};`;
  }, '');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function camelToKebabCase (text) {
  if (!text) {
    return '';
  }
  text = String( text );
  return (
    text[ 0 ].toLowerCase() + text.substr( 1 )
  ).replace( /([A-Z])/g, '-$1' ).toLowerCase();
}

/**
 * @param {string} href
 * @return {*}
 */
export function parseQueryString (href) {
  const queryString = href.split('?').slice(1);
  if (!queryString.length) {
    return {};
  }

  return queryString[ 0 ].split( '&' ).map(part => {
    const keyValue = part.split( '=' );
    return {
      [keyValue[ 0 ]]: keyValue[ 1 ]
    };
  }).reduce((result, obj) => {
    return Object.assign(result, obj);
  })
}

/**
 * @param {number} number
 * @return {string}
 */
export function zeroFill (number) {
  return number < 10 ? '0' + number : number;
}
