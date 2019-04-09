/**
 * @returns {boolean}
 */
export function isBrowserSafari () {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test( navigator.userAgent );
}

/**
 * @return {boolean}
 */
export function isTouchEventsSupported () {
  return 'ontouchstart' in document.documentElement;
}

/**
 * @return {boolean}
 */
export function isPassiveEventSupported () {
  let passiveSupported = false;

  try {
    const options = {
      get passive() { // This function will be called when the browser
        //   attempts to access the passive property.
        passiveSupported = true;
      }
    };

    window.addEventListener('test', options, options);
    window.removeEventListener('test', options, options);
  } catch(err) {
    passiveSupported = false;
  }

  return passiveSupported;
}

/**
 * @return {*}
 */
export function passiveIfSupported (passive = true) {
  return isPassiveEventSupported() ? { passive } : false;
}

export const isWebWorkerSupported = () => typeof window.Worker !== 'undefined';
export const isOffscreenCanvasSupported = () => typeof window.OffscreenCanvas !== 'undefined';

/**
 * @return {*}
 */
export function isTransformSupported () {
  const prefix = 'transform';
  const div = document.createElement('div');

  return div && div.style[ prefix ] !== undefined;
}
