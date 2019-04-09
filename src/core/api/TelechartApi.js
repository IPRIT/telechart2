import TelechartWorker from '../worker/telechart.worker';
import { TelechartWorkerEvents } from '../worker/worker-events';
import { EventEmitter } from '../misc/EventEmitter';
import { createTelechart } from './misc/createTelechart';
import {
  ChartVariables, clampNumber,
  createElement, cssText, getElementOffset,
  getElementWidth,
  isOffscreenCanvasSupported, isTouchEventsSupported, isTransformSupported,
  resolveElement, setAttributes
} from '../../utils';

export class TelechartApi extends EventEmitter {

  /**
   * @type {boolean}
   */
  isOffscreenCanvas = false;

  /**
   * @type {boolean}
   */
  enableOffscreenCanvas = ChartVariables.enableOffscreenCanvas;

  /**
   * @type {HTMLCanvasElement}
   */
  canvas = null;

  /**
   * @type {Worker}
   */
  worker = null;

  /**
   * @type {Telechart2}
   */
  telechart = null;

  /**
   * @param {string | Element} mountTo
   * @param options
   */
  createChart (mountTo, options) {
    const container = resolveElement( mountTo );

    const canvas = this.canvas = createElement('canvas');
    container.appendChild( canvas );

    this._updateDimensions( canvas );

    const settings = {
      options,
      environmentOptions: this._getEnvironmentOptions()
    };

    this.isOffscreenCanvas = this.enableOffscreenCanvas && isOffscreenCanvasSupported();

    if (this.isOffscreenCanvas) {
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new TelechartWorker();

      worker.postMessage({
        type: TelechartWorkerEvents.SETUP,
        canvas: offscreen,
        settings
      }, [ offscreen ]);

      this.worker = worker;
    } else {
      this.telechart = createTelechart({ canvas, settings });
    }
  }

  initialize () {
    this.addEventListeners();
  }

  /**
   * @param {string} themeName
   */
  setTheme (themeName) {
    if (this.isOffscreenCanvas) {
      this.worker.postMessage({
        type: TelechartWorkerEvents.SET_THEME,
        themeName
      });
    } else {
      this.telechart.setTheme( themeName );
    }
  }

  addEventListeners () {
    this._attachResizeListener();
  }

  /**
   * @private
   */
  _attachResizeListener () {
    if (this._resizeListener) {
      this._detachResizeListener();
    }

    this._resizeListener = this._onResize.bind( this );
    window.addEventListener( 'resize', this._resizeListener );
  }

  /**
   * @private
   */
  _detachResizeListener () {
    if (!this._resizeListener) {
      return;
    }

    window.removeEventListener( 'resize', this._resizeListener );
    this._resizeListener = null;
  }

  /**
   * @private
   */
  _onResize (ev) {
    this._updateDimensions();
    this._updateEnvironmentOptions();

    this.emit( 'resize', ev );
  }

  /**
   * @private
   */
  _updateDimensions (canvas = this.canvas) {
    const parentNode = canvas.parentNode;

    this.canvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.canvasHeight = ChartVariables.maxHeight;

    const devicePixelRatio = window.devicePixelRatio;

    setAttributes(canvas, {
      style: cssText({
        width: `${this.canvasWidth}px`,
        height: `${this.canvasHeight}px`
      }),
      width: (devicePixelRatio * this.canvasWidth) | 0,
      height: (devicePixelRatio * this.canvasHeight) | 0
    });
  }

  /**
   * @private
   */
  _updateEnvironmentOptions () {
    const environmentOptions = this._getEnvironmentOptions();

    if (this.isOffscreenCanvas) {
      this.worker.postMessage({
        type: TelechartWorkerEvents.UPDATE_ENVIRONMENT,
        environmentOptions
      });
    } else {
      this.telechart.setEnvironmentOptions( environmentOptions );
    }
  }

  /**
   * @return {{canvasOffset: {top: number, left: number}, devicePixelRatio: number}}
   * @private
   */
  _getEnvironmentOptions () {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasOffset = getElementOffset( this.canvas );
    const canvasWidth = this.canvasWidth;
    const canvasHeight = this.canvasHeight;

    return {
      devicePixelRatio,
      canvasOffset,
      isTouchEventsSupported: isTouchEventsSupported(),
      isTransformSupported: isTransformSupported(),
      canvasWidth,
      canvasHeight
    };
  }
}
