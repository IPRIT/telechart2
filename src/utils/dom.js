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
 * @param {Element} targetElement
 * @param {Element} relativeElement
 * @return {{ top: number, left: number }}
 */
export function getElementRelativeOffset (targetElement, relativeElement) {
  const targetOffset = getElementOffset(targetElement);
  const relativeOffset = getElementOffset(relativeElement);

  return {
    top: targetOffset.top - relativeOffset.top + relativeElement.scrollTop,
    left: targetOffset.left - relativeOffset.left + relativeElement.scrollLeft
  };
}

/**
 * @returns {number}
 */
export function getDocumentHeight () {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
}

/**
 * @return {number}
 */
export function getDocumentScrollTop () {
  const supportPageOffset = window.pageXOffset !== undefined;
  const isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");

  return supportPageOffset
    ? window.pageYOffset
    : isCSS1Compat
      ? document.documentElement.scrollTop
      : document.body.scrollTop;
}

/**
 * @returns {number}
 */
export function getWindowHeight () {
  return window.innerHeight ||
    (document.documentElement || document.body).clientHeight;
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

/**
 * @param {Element} element
 * @returns {number}
 */
export function getElementScrollHeight (element) {
  return Math.max(
    element.scrollHeight,
    element.offsetHeight,
    element.clientHeight
  );
}

/**
 * @param {Element} element
 * @returns {number}
 */
export function getElementScrollWidth (element) {
  return Math.max(
    element.scrollWidth,
    element.offsetWidth,
    element.clientWidth
  );
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
 * @param element
 */
export function removeElement (element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild( element );
  }
}

/**
 * @param {Element} element
 * @param {string} className
 */
export function hasClass (element, className) {
  if (element.classList) {
    // return element.classList.contains( className );
  }
  return new RegExp('(\\s|^)' + className + '(\\s|$)').test( element.className );
}

/**
 * @param {Element} element
 * @param {string|Array<string>} classNames
 */
export function addClass (element, classNames = []) {
  classNames = [].concat( classNames );

  if (element.classList) {
    // return element.classList.add( ...classNames );
  }

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

  if (element.classList) {
    // return element.classList.remove( ...classNames );
  }

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
