import { EventEmitter } from '../misc/EventEmitter';
import { FRAMES_PER_SECOND } from '../../utils';

export const AnimationSourceEvents = {
  UPDATE: 'update'
};

export class AnimationSource extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _timeElapsed = 0;

  /**
   * @type {number}
   * @private
   */
  _timeScale = 1;

  /**
   * @type {number}
   * @private
   */
  _updateInvokes = 0;

  /**
   * @type {number}
   * @private
   */
  _updatesPerSecond = 60;

  /**
   * @type {number}
   * @private
   */
  _updateEach = 1;

  /**
   * @type {number}
   * @private
   */
  _lastUpdateAt = 0;

  /**
   * @type {boolean}
   * @private
   */
  _paused = false;

  /**
   * @param {number} updatesPerSecond
   * @param {number} timeScale
   */
  constructor (updatesPerSecond = 60, timeScale = 1) {
    super();

    this._updatesPerSecond = Math.min( 60, Math.max( 1e-8, updatesPerSecond ) );
    this._updateEach = FRAMES_PER_SECOND / this._updatesPerSecond;
    this._timeScale = timeScale;
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    if (this._paused) {
      return;
    }

    this._timeElapsed += deltaTime;
    this._updateInvokes++;

    if (this._updateInvokes % this._updateEach < 1) {
      this._callUpdate( ( this._timeElapsed - this._lastUpdateAt ) * this._timeScale );
      this._lastUpdateAt = this._timeElapsed;
    }
  }

  /**
   * Disposes the instance
   */
  dispose () {
    this._paused = true;
    this.removeAllListeners();
  }

  /**
   * @returns {boolean}
   */
  get isPaused () {
    return this._paused;
  }

  /**
   * @returns {boolean}
   */
  get isRunning () {
    return !this._paused;
  }

  /**
   * @returns {number}
   */
  get timeScale () {
    return this._timeScale;
  }

  /**
   * @param {number} value
   */
  set timeScale (value) {
    this._timeScale = value;
  }

  /**
   * @param {number} deltaTime
   * @private
   */
  _callUpdate (deltaTime) {
    this.emit( AnimationSourceEvents.UPDATE, deltaTime );
  }
}
