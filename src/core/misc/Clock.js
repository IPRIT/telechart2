export class Clock {

  /**
   * @type {number}
   * @private
   */
  _lastUpdateMs = 0;

  constructor () {
    this._lastUpdateMs = performance.now();
  }

  /**
   * @return {number}
   */
  getDelta () {
    const now = performance.now();
    const delta = now - this._lastUpdateMs;
    this._lastUpdateMs = now;

    return delta;
  }
}
