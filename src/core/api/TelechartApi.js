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
   * @type {Element}
   */
  rootElement = null;

  /**
   * @type {HTMLCanvasElement}
   */
  mainCanvas = null;

  /**
   * @type {HTMLCanvasElement}
   */
  navigationSeriesCanvas = null;

  /**
   * @type {HTMLCanvasElement}
   */
  navigationUICanvas = null;

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

    const root = this.rootElement = this._createRoot( container );

    const mainCanvas = this.mainCanvas = this._createMainCanvas();
    const navigationSeriesCanvas = this.navigationSeriesCanvas = this._createNavigationSeriesCanvas();
    const navigationUICanvas = this.navigationUICanvas = this._createNavigationUICanvas();

    root.appendChild( mainCanvas );
    root.appendChild( navigationSeriesCanvas );
    root.appendChild( navigationUICanvas );

    this._updateMainCanvasDimensions( mainCanvas );
    this._updateNavigationSeriesCanvasDimensions( navigationSeriesCanvas );
    this._updateNavigationUICanvasDimensions( navigationUICanvas );

    const settings = {
      options,
      environmentOptions: this._getEnvironmentOptions()
    };

    this.isOffscreenCanvas = this.enableOffscreenCanvas && isOffscreenCanvasSupported();

    if (this.isOffscreenCanvas) {
      const mainOffscreen = mainCanvas.transferControlToOffscreen();
      const navigationSeriesOffscreen = navigationSeriesCanvas.transferControlToOffscreen();
      const navigationUIOffscreen = navigationUICanvas.transferControlToOffscreen();

      const worker = new TelechartWorker();

      worker.postMessage({
        type: TelechartWorkerEvents.SETUP,
        mainCanvas: mainOffscreen,
        navigationSeriesCanvas: navigationSeriesOffscreen,
        navigationUICanvas: navigationUIOffscreen,
        settings
      }, [
        mainOffscreen,
        navigationSeriesOffscreen,
        navigationUIOffscreen
      ]);

      this.worker = worker;
    } else {
      this.telechart = createTelechart({
        mainCanvas,
        navigationSeriesCanvas,
        navigationUICanvas,
        settings
      });
      console.log( this.telechart );
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
    this._updateMainCanvasDimensions();
    this._updateNavigationSeriesCanvasDimensions();
    this._updateNavigationUICanvasDimensions();
    this._updateEnvironmentOptions();

    this.emit( 'resize', ev );
  }

  /**
   * @private
   */
  _updateMainCanvasDimensions (canvas = this.mainCanvas) {
    const parentNode = canvas.parentNode;

    this.mainCanvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.mainCanvasHeight = ChartVariables.mainMaxHeight;

    const devicePixelRatio = window.devicePixelRatio;

    setAttributes(canvas, {
      style: cssText({
        width: `${this.mainCanvasWidth}px`,
        height: `${this.mainCanvasHeight}px`
      }),
      width: (devicePixelRatio * this.mainCanvasWidth) | 0,
      height: (devicePixelRatio * this.mainCanvasHeight) | 0
    });
  }

  /**
   * @private
   */
  _updateNavigationSeriesCanvasDimensions (canvas = this.navigationSeriesCanvas) {
    const parentNode = canvas.parentNode;

    this.navigationSeriesCanvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.navigationSeriesCanvasHeight = ChartVariables.navigationChartHeight;

    const devicePixelRatio = window.devicePixelRatio;

    setAttributes(canvas, {
      style: cssText({
        width: `${this.navigationSeriesCanvasWidth}px`,
        height: `${this.navigationSeriesCanvasHeight}px`
      }),
      width: (devicePixelRatio * this.navigationSeriesCanvasWidth) | 0,
      height: (devicePixelRatio * this.navigationSeriesCanvasHeight) | 0
    });
  }

  /**
   * @private
   */
  _updateNavigationUICanvasDimensions (canvas = this.navigationUICanvas) {
    const parentNode = canvas.parentNode;

    this.navigationUICanvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.navigationUICanvasHeight = ChartVariables.navigationChartUIHeight;

    const devicePixelRatio = window.devicePixelRatio;

    setAttributes(canvas, {
      style: cssText({
        width: `${this.navigationUICanvasWidth}px`,
        height: `${this.navigationUICanvasHeight}px`
      }),
      width: (devicePixelRatio * this.navigationUICanvasWidth) | 0,
      height: (devicePixelRatio * this.navigationUICanvasHeight) | 0
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

    const canvasOffset = getElementOffset( this.mainCanvas );
    const canvasWidth = this.mainCanvasWidth;
    const canvasHeight = this.mainCanvasHeight;

    const navigationSeriesCanvasOffset = getElementOffset( this.navigationSeriesCanvas );
    const navigationSeriesCanvasWidth = this.navigationSeriesCanvasWidth;
    const navigationSeriesCanvasHeight = this.navigationSeriesCanvasHeight;

    const navigationUICanvasOffset = getElementOffset( this.navigationUICanvas );
    const navigationUICanvasWidth = this.navigationUICanvasWidth;
    const navigationUICanvasHeight = this.navigationUICanvasHeight;

    return {
      // system
      devicePixelRatio,
      isTouchEventsSupported: isTouchEventsSupported(),
      isTransformSupported: isTransformSupported(),

      // main canvas
      canvasOffset,
      canvasWidth,
      canvasHeight,

      // navigation canvas series
      navigationSeriesCanvasOffset,
      navigationSeriesCanvasWidth,
      navigationSeriesCanvasHeight,

      // navigation canvas UI
      navigationUICanvasOffset,
      navigationUICanvasWidth,
      navigationUICanvasHeight,
    };
  }

  /**
   * @param container
   * @private
   */
  _createRoot (container) {
    const root = createElement('div', {
      attrs: {
        class: 'telechart2-root'
      }
    });

    container.appendChild( root );

    return root;
  }

  /**
   * @private
   */
  _createMainCanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart-series-canvas'
      }
    });
  }

  /**
   * @private
   */
  _createNavigationSeriesCanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart-navigation-series-canvas'
      }
    });
  }

  /**
   * @private
   */
  _createNavigationUICanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart-navigation-ui-canvas'
      }
    });
  }
}
