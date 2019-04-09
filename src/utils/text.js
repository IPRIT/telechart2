/**
 * @param {string} text
 * @return {string}
 */
export function capitalize (text) {
  if (!text) {
    return '';
  }
  text = String( text );
  return text[ 0 ].toUpperCase() + text.substr(1);
}

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
