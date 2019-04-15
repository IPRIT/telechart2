export const FRAMES_PER_SECOND = 60;
export const FRAMES_DELTA_SEC = 1 / 60;
export const FRAMES_DELTA_MS = 1000 / 60;

/**
 * @param {number} value
 * @param {number} deltaTime
 * @param {number} framesDeltaSec
 * @returns {number}
 */
export function warp (value, deltaTime, framesDeltaSec = FRAMES_DELTA_SEC) {
  return value * warpRatio( deltaTime, framesDeltaSec );
}

/**
 * @param {number} deltaTime
 * @param {number} framesDeltaSec
 * @returns {number}
 */
export function warpRatio (deltaTime, framesDeltaSec = FRAMES_DELTA_SEC) {
  return deltaTime / framesDeltaSec;
}

/**
 * @param {number} timeoutMs
 * @param {*} args
 * @return {Promise<void>}
 */
export function animationTimeout (timeoutMs = 0, ...args) {
  return new Promise(resolve => {
    const fulfillmentCallback = resolve.bind( null, ...args );
    const cb = () => requestAnimationFrame( fulfillmentCallback );

    if (!timeoutMs) {
      cb();
    } else {
      setTimeout( _ => cb(), timeoutMs );
    }
  });
}

export const linear = t => t;
export const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
export const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
