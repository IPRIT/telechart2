import { EventEmitter } from '../misc/EventEmitter';
import { warp } from '../../utils';

let TRANSITION_ID = 1;

export const TransitionEvents = {
  STARTED: 'started',
  PAUSED: 'paused',
  FINISHED: 'paused',
};

export const TransitionState = {
  NOT_STARTED: 0x1,
  RUNNING: 0x2,
  PAUSED: 0x4,
  FINISHED: 0x6,
};

export class TransitionPlayback extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = TRANSITION_ID++;

  /**
   * Uses to set time direction and scale
   * Default is 1 - default velocity
   *
   * @type {number}
   * @private
   */
  _timeScale = 1;

  /**
   * @type {number}
   * @private
   */
  _state = TransitionState.NOT_STARTED;

  /**
   * @type {number}
   * @private
   */
  _velocity = 1;

  /**
   * @type {number}
   * @private
   */
  _acceleration = 0;

  /**
   * @type {number}
   * @private
   */
  _fromPosition = null;

  /**
   * @type {number}
   * @private
   */
  _toPosition = null;

  /**
   * @type {number}
   * @private
   */
  _currentPosition = 0;

  /**
   * @type {number}
   * @private
   */
  _startPosition = 0;

  /**
   * @type {*}
   * @private
   */
  _options = {};

  /**
   * @param {number} from
   * @param {number} to
   * @param {*} options
   */
  constructor (from, to, options = {}) {
    super();

    this._fromPosition = from;
    this._toPosition = to;

    this._initOptions( options );
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    if (!this.isRunning) {
      return;
    }
    this._updateVelocity( deltaTime );
    this._updateCurrentPosition( deltaTime );
  }

  /**
   * Play transition
   */
  start () {
    if (this.isRunning) {
      return;
    }

    this._state = TransitionState.RUNNING;
    this._startPosition = this._fromPosition;
    this._currentPosition = this._startPosition;

    this.emit( TransitionEvents.STARTED );
  }

  /**
   * Pause transition
   */
  pause () {
    this._state = TransitionState.PAUSED;
    this.emit( TransitionEvents.PAUSED );
  }

  /**
   * Finish transition
   */
  finish () {
    this._state = TransitionState.FINISHED;
    this.emit( TransitionEvents.FINISHED );
    this._dispose();
  }

  /**
   * Reset transition
   */
  reset () {
    this._state = TransitionState.NOT_STARTED;
    this._initOptions( this._options );
    this._currentPosition = this._fromPosition;
    this._startPosition = this._fromPosition;
  }

  /**
   * @param {number} to
   */
  setToPosition (to) {
    this._toPosition = to;
  }

  /**
   * @param {number} a
   */
  setAcceleration (a) {
    this._acceleration = a;
  }

  /**
   * @param {number} timeScale
   */
  setTimeScale (timeScale) {
    this._timeScale = timeScale;
  }

  /**
   * @param {number} velocity
   */
  setVelocity (velocity) {
    this._velocity = velocity;
  }

  /**
   * @returns {number}
   */
  get timeScale () {
    return this._timeScale;
  }

  /**
   * @returns {number}
   */
  get id () {
    return this._id;
  }

  /**
   * @returns {number}
   */
  get velocity () {
    return this._velocity;
  }

  /**
   * @returns {boolean}
   */
  get isRunning () {
    return this._state === TransitionState.RUNNING;
  }

  /**
   * @returns {boolean}
   */
  get isPaused () {
    return this._state === TransitionState.PAUSED;
  }

  /**
   * @returns {boolean}
   */
  get isFinished () {
    return this._state === TransitionState.FINISHED;
  }

  /**
   * @returns {number}
   */
  get fromPosition () {
    return this._fromPosition;
  }

  /**
   * @returns {number}
   */
  get toPosition () {
    return this._toPosition;
  }

  /**
   * @returns {number}
   */
  get startPosition () {
    return this._startPosition;
  }

  /**
   * @returns {number}
   */
  get currentPosition () {
    return this._currentPosition;
  }

  /**
   * @returns {number}
   */
  get distanceToDestination () {
    return Math.abs( this._toPosition - this._currentPosition );
  }

  /**
   * @param {*} options
   * @private
   */
  _initOptions (options) {
    this._options = options;

    let {
      timeScale = 1,
      velocity = 1,
      maxVelocity = 1,
      acceleration = 0
    } = options;

    this._timeScale = timeScale;
    this._velocity = velocity;
    this._maxVelocity = maxVelocity;
    this._acceleration = acceleration;
  }

  /**
   * @param {number} deltaTime
   * @private
   */
  _updateCurrentPosition (deltaTime) {
    if (this._toPosition === null) {
      return this.dispose();
    }

    const sign = Math.sign( this._toPosition - this._currentPosition );
    this._currentPosition += sign * this._computeDeltaDistance( deltaTime );

    if (this.distanceToDestination < .1) {
      this.finish();
    }
  }

  /**
   * @param {number} deltaTime
   * @returns {number}
   * @private
   */
  _updateVelocity (deltaTime) {
    if (this._acceleration) {
      this._velocity = Math.min(
        this._maxVelocity,
        this._velocity + warp( this._acceleration, deltaTime )
      );
    }
  }

  /**
   * @param {number} deltaTime
   * @returns {number}
   * @private
   */
  _computeDeltaDistance (deltaTime) {
    const deltaDistance = this._timeScale * (
      this._velocity * deltaTime
      + this._acceleration * deltaTime * deltaTime * .5
    );

    return Math.min( deltaDistance, this.distanceToDestination );
  }

  /**
   * Destroys the transition
   */
  _dispose () {
    this._fromPosition = null;
    this._toPosition = null;
    this._currentPosition = null;
    this._startPosition = null;
    this._options = null;

    this.removeAllListeners();
  }
}
