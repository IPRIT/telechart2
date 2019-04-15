import { objectEachKey } from "./base";
import { camelToKebabCase } from './text';

/**
 * @param {string} tagName
 * @param {Object} options
 * @param {Array|*} children
 * @param {string|*} ns
 * @return {Element}
 */
export function createElement (tagName, options = {}, children = [], ns = null) {
  const element = !ns
    ? document.createElement( tagName )
    : document.createElementNS( ns, tagName );

  if (options.attrs) {
    !options.useNS
      ? setAttributes( element, options.attrs )
      : setAttributesNS( element, options.attrs, options.attrsNS || null );
  }

  if (children || Array.isArray( children )) {
    children = [].concat( children );
    children.forEach(node => {
      if (typeof node === 'string') {
        // optimistic way
        if (/[<>]/i.test( node )) {
          element.innerHTML += node;
        } else {
          element.textContent += node;
        }
      } else {
        element.appendChild( node );
      }
    });
  }

  return element;
}

/**
 * @param {Element|string} elementOrSelector
 * @return {Element | null}
 */
export function resolveElement (elementOrSelector) {
  if (typeof elementOrSelector !== 'string') {
    return elementOrSelector;
  }
  return document.querySelector( elementOrSelector );
}

/**
 * @param {Element} element
 * @return {{top: number, left: number}}
 */
export function getElementOffset (element) {
  if (!element) {
    return { top: 0, left: 0 };
  }

  try {
    // Get document-relative position by adding viewport scroll to viewport-relative gBCR
    const rect = element.getBoundingClientRect();
    const win = element.ownerDocument.defaultView;
    return {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset
    };
  } catch (e) {
    return { top: 0, left: 0 };
  }
}

/**
 * @param {Element} element
 * @returns {number}
 */
export function getElementHeight (element) {
  return element.innerHeight || element.clientHeight;
}

/**
 * @param {Element} element
 * @returns {number}
 */
export function getElementWidth (element) {
  return element.innerWidth || element.clientWidth;
}

const camelCaseAttrWhiteList = [
];

/**
 * @param {Element} element
 * @param {Object} attrs
 */
export function setAttributes (element, attrs = {}) {
  element = resolveElement( element );

  objectEachKey(attrs, key => {
    const attr = camelCaseAttrWhiteList.includes( key )
      ? key
      : camelToKebabCase( key );

    element.setAttribute( attr, attrs[ key ] );
  });
}

/**
 * @param {Element} element
 * @param {Object} attrs
 * @param {string | *} ns
 */
export function setAttributesNS (element, attrs = {}, ns = null) {
  element = resolveElement( element );

  objectEachKey(attrs, key => {
    const attr = camelCaseAttrWhiteList.includes( key )
      ? key
      : camelToKebabCase( key );

    element.setAttributeNS( ns, attr, attrs[ key ] );
  });
}

/**
 * @param {Element} element
 * @param {string} attr
 * @param {*} value
 * @param {string | *} ns
 */
export function setAttributeNS (element, attr, value, ns) {
  // it's a magic but it increases speed for 1-2ms on slow devices
  // prevent from babel optimisation
  ns = ns || null;
  element.setAttributeNS( ns, attr, value );
}

/**
 * @param {Element} element
 * @param {string} className
 */
export function hasClass (element, className) {
  return new RegExp('(\\s|^)' + className + '(\\s|$)').test( element.className );
}

/**
 * @param {Element} element
 * @param {string|Array<string>} classNames
 */
export function addClass (element, classNames = []) {
  classNames = [].concat( classNames );

  let className = element.className;

  for (let i = 0; i < classNames.length; ++i) {
    if (!hasClass( element, classNames[ i ] )) {
      className += ` ${classNames[ i ]}`;
    }
  }

  element.className = className.trim();
}

/**
 * @param {Element} element
 * @param {string|Array<string>} classNames
 */
export function removeClass (element, classNames = []) {
  classNames = [].concat( classNames );

  let existingClasses = element.className.split( ' ' );
  let classesToDelete = new Set( classNames );
  let className = '';

  for (let i = 0; i < existingClasses.length; ++i) {
    if (!classesToDelete.has( existingClasses[ i ] )) {
      className += ` ${existingClasses[ i ]}`;
    }
  }

  element.className = className.trim();
}
