/**
 * @param {Element | Window} element
 * @param {string} eventName
 * @param {Function} cb
 */
export function addEventListenerOnce (element, eventName, cb) {
  if (!element) {
    return;
  }

  const listener = ev => {
    cb( ev );
    element.removeEventListener( eventName, listener );
  };

  element.addEventListener( eventName, listener );
}
