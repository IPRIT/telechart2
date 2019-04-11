import TelechartWorker from '../worker/telechart.worker';
import { TelechartWorkerEvents } from '../worker/worker-events';
import { EventEmitter } from '../misc/EventEmitter';
import { createTelechart } from './misc/createTelechart';
import { LabelButtons } from '../ui/LabelButtons';
import { DataLabel } from '../ui/DataLabel';

import {
  addClass,
  ChartThemes,
  ChartVariables, clampNumber,
  createElement, cssText, getElementOffset,
  getElementWidth, interpolateThemeClass,
  isOffscreenCanvasSupported, isTouchEventsSupported, isTransformSupported, passiveIfSupported, removeClass,
  resolveElement, setAttributes, throttle
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
   * @type {DataLabel}
   */
  dataLabel = null;

  /**
   * @param {string | Element} mountTo
   * @param options
   */
  createChart (mountTo, options) {
    const container = resolveElement( mountTo );

    const root = this.rootElement = this._createRoot( container );
    const header = this.headerElement = this._createHeader( root );

    root.appendChild( header );

    const mainCanvas = this.mainCanvas = this._createMainCanvas();
    const axisCanvas = this.axisCanvas = this._createAxisCanvas();
    const navigationSeriesCanvas = this.navigationSeriesCanvas = this._createNavigationSeriesCanvas();
    const navigationUICanvas = this.navigationUICanvas = this._createNavigationUICanvas();

    const mainCanvasRoot = this.mainCanvasRoot = this._createMainCanvasRoot( root );
    mainCanvasRoot.appendChild( mainCanvas );
    mainCanvasRoot.appendChild( axisCanvas );

    const navigatorRoot = this.navigatorRoot = this._createNavigatorRoot( root );
    navigatorRoot.appendChild( navigationSeriesCanvas );
    navigatorRoot.appendChild( navigationUICanvas );

    this._updateMainCanvasDimensions( mainCanvas );
    this._updateAxisCanvasDimensions( axisCanvas );
    this._updateNavigationSeriesCanvasDimensions( navigationSeriesCanvas );
    this._updateNavigationUICanvasDimensions( navigationUICanvas );

    const settings = {
      options,
      environmentOptions: this._getEnvironmentOptions()
    };

    const hasForceOffscreenState = typeof window.t2_foc !== 'undefined';
    const forceOffscreenState = hasForceOffscreenState ? t2_foc : null;
    this.isOffscreenCanvas = (
      forceOffscreenState !== null
        ? forceOffscreenState 
        : this.enableOffscreenCanvas
    ) && isOffscreenCanvasSupported();

    if (this.isOffscreenCanvas) {
      const mainOffscreen = mainCanvas.transferControlToOffscreen();
      const axisOffscreen = axisCanvas.transferControlToOffscreen();
      const navigationSeriesOffscreen = navigationSeriesCanvas.transferControlToOffscreen();
      const navigationUIOffscreen = navigationUICanvas.transferControlToOffscreen();

      const worker = this.worker = new TelechartWorker();

      this.initializeDataLabel();
      this._createLabelButtons();

      worker.postMessage({
        type: TelechartWorkerEvents.SETUP,
        mainCanvas: mainOffscreen,
        axisCanvas: axisOffscreen,
        navigationSeriesCanvas: navigationSeriesOffscreen,
        navigationUICanvas: navigationUIOffscreen,
        settings
      }, [
        mainOffscreen,
        axisOffscreen,
        navigationSeriesOffscreen,
        navigationUIOffscreen
      ]);
    } else {
      this.initializeDataLabel();
      this._createLabelButtons();

      this.telechart = createTelechart({
        mainCanvas,
        axisCanvas,
        navigationSeriesCanvas,
        navigationUICanvas,
        api: this,
        settings
      });

      console.log( this.telechart );
    }

    this.setTitle( options.title );
  }

  initialize () {
    this.addEventListeners();

    this._sendEventThrottled = throttle( this._sendEvent.bind( this ), 16 );
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

    removeClass(this.rootElement, [
      interpolateThemeClass( ChartThemes.default ),
      interpolateThemeClass( ChartThemes.dark ),
    ]);

    addClass(this.rootElement, [
      interpolateThemeClass( themeName )
    ]);
  }

  /**
   * @param {string} title
   */
  setTitle (title) {
    if (this.isOffscreenCanvas) {
      this.worker.postMessage({
        type: TelechartWorkerEvents.SET_TITLE,
        title
      });
    } else {
      this.telechart.setTitle( title );
    }

    this.titleElement.innerHTML = title;
  }

  initializeButtons (buttons) {
    this.labelButtons.initialize( buttons );
  }

  updateButtons (buttons) {
    this.labelButtons.updateButtons( buttons );
  }

  /**
   * @param label
   * @param longTap
   */
  toggleSeries (label, longTap = false) {
    if (this.isOffscreenCanvas) {
      this.worker.postMessage({
        type: TelechartWorkerEvents.TOGGLE_SERIES,
        label,
        longTap
      });
    } else {
      longTap
        ? this.telechart._chart.toggleAllSeriesExcept( label )
        : this.telechart._chart.toggleSeries( label );
    }
  }

  addEventListeners () {
    this._attachResizeListener();
    this._attachMainListeners();
  }

  initializeDataLabel () {
    const dataLabel = new DataLabel( this.rootElement );
    dataLabel.initialize();

    if (this.worker) {
      const eventEmitter = new EventEmitter();

      this.worker.addEventListener('message', ev => {
        const type = ev.data.type;
        eventEmitter.emit( type, ev );
      });

      eventEmitter.on(TelechartWorkerEvents.UPDATE_DATA_LABEL, ev => {
        const data = ev.data.data;
        this.updateDataLabel( data );
      });

      eventEmitter.on(TelechartWorkerEvents.SET_DATA_LABEL_VISIBILITY, ev => {
        const visibility = ev.data.visibility;
        this.setDataLabelVisibility( visibility );
      });
    }

    this.dataLabel = dataLabel;
  }

  /**
   * @param visibility
   */
  setDataLabelVisibility (visibility) {
    visibility
      ? this.dataLabel.showLabel()
      : this.dataLabel.hideLabel();
  }

  /**
   * @param changed
   * @param lines
   * @param viewportRange
   */
  updateDataLabel ({ changed = true, lines = [], viewportRange = [] } = {}) {
    this.dataLabel.setData( lines );

    const date1 = new Date( viewportRange[ 0 ] );
    const date2 = new Date( viewportRange[ 1 ] );
    if (date1.getFullYear() !== date2.getFullYear()) {
      this.dataLabel.showYear();
    } else {
      this.dataLabel.hideYear();
    }

    if (changed) {
      this.dataLabel.updateContentRequested = true;
      this.dataLabel.updatePositionRequested = true;
    }
  }

  /**
   * @private
   */
  _attachResizeListener () {
    if (this._resizeListener) {
      this._detachResizeListener();
    }

    this._resizeListener = throttle( this._onResize.bind( this ), 17 );
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
    this._updateAxisCanvasDimensions();
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

    const devicePixelRatio = window.devicePixelRatio || 1;

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
  _updateAxisCanvasDimensions (canvas = this.axisCanvas) {
    const parentNode = canvas.parentNode;

    this.axisCanvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.axisCanvasHeight = ChartVariables.mainMaxHeight;

    const devicePixelRatio = window.devicePixelRatio || 1;

    setAttributes(canvas, {
      style: cssText({
        width: `${this.axisCanvasWidth}px`,
        height: `${this.axisCanvasHeight}px`
      }),
      width: (devicePixelRatio * this.axisCanvasWidth) | 0,
      height: (devicePixelRatio * this.axisCanvasHeight) | 0
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
    ) - 24; // left + right padding
    this.navigationSeriesCanvasHeight = ChartVariables.navigationChartHeight;

    const devicePixelRatio = window.devicePixelRatio || 1;

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

    const devicePixelRatio = window.devicePixelRatio || 1;

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

    const axisCanvasOffset = getElementOffset( this.axisCanvas );
    const axisCanvasWidth = this.axisCanvasWidth;
    const axisCanvasHeight = this.axisCanvasHeight;

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

      // axis canvas
      axisCanvasOffset,
      axisCanvasWidth,
      axisCanvasHeight,

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
   * @param container
   * @private
   */
  _createHeader (container) {
    const header = createElement('div', {
      attrs: {
        class: 'telechart2-header'
      }
    });

    this._createTitle( header );

    container.appendChild( header );

    return header;
  }

  /**
   * @param container
   * @param text
   * @return {Element}
   * @private
   */
  _createTitle (container, text) {
    const title = this.titleElement = createElement('span', {
      attrs: {
        class: 'telechart2-title'
      }
    }, text);

    container.appendChild( title );

    return title;
  }

  /**
   * @private
   */
  _createMainCanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart2-series-canvas'
      }
    });
  }

  /**
   * @private
   */
  _createAxisCanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart2-axis-canvas'
      }
    });
  }

  /**
   * @private
   */
  _createNavigationSeriesCanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart2-navigation-series-canvas'
      }
    });
  }

  /**
   * @private
   */
  _createNavigationUICanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart2-navigation-ui-canvas'
      }
    });
  }

  /**
   * @return {Element}
   * @private
   */
  _createMainCanvasRoot (container) {
    const mRoot = createElement('div', {
      attrs: {
        class: 'telechart2-main'
      }
    });

    container.appendChild( mRoot );

    return mRoot;
  }

  /**
   * @return {Element}
   * @private
   */
  _createNavigatorRoot (container) {
    const nRoot = createElement('div', {
      attrs: {
        class: 'telechart2-navigation'
      }
    });

    container.appendChild( nRoot );

    return nRoot;
  }

  /**
   * @private
   */
  _createLabelButtons () {
    this.labelButtons = new LabelButtons( this, this.rootElement );

    if (this.worker) {
      const eventEmitter = new EventEmitter();

      this.worker.addEventListener('message', ev => {
        const type = ev.data.type;
        eventEmitter.emit( type, ev );
      });

      eventEmitter.on(TelechartWorkerEvents.INITIALIZE_BUTTONS, ev => {
        const { buttons = [] } = ev.data;
        this.initializeButtons( buttons );
      });

      eventEmitter.on(TelechartWorkerEvents.UPDATE_BUTTONS, ev => {
        const { buttons = [] } = ev.data;
        this.updateButtons( buttons );
      });
    }
  }

  _attachMainListeners () {
    this.mainCanvasRoot.addEventListener('mousemove', ev => {
      this._onMainCanvasMouseMove( ev );
    });
    this.mainCanvasRoot.addEventListener('mouseleave', ev => {
      this._onMainCanvasMouseLeave( ev );
    });

    this.mainCanvasRoot.addEventListener('touchstart', ev => {
      this._onMainCanvasTouchStart( ev );
    });
    this.mainCanvasRoot.addEventListener('touchmove', ev => {
      this._onMainCanvasTouchMove( ev );
    });
    this.mainCanvasRoot.addEventListener('touchend', ev => {
      this._onMainCanvasTouchEnd( ev );
    });
  }

  _onMainCanvasMouseMove (ev) {
    this._sendEventThrottled( 'mousemove', ev );
  }

  _onMainCanvasMouseLeave (ev) {
    this._sendEventThrottled( 'mouseleave', ev );
  }

  _onMainCanvasTouchStart (ev) {
    this._sendEventThrottled( 'touchstart', ev, passiveIfSupported( false ) );
  }

  _onMainCanvasTouchMove (ev) {
    this._sendEventThrottled( 'touchmove', ev, passiveIfSupported( false ) );
  }

  _onMainCanvasTouchEnd (ev) {
    this._sendEventThrottled( 'touchend', ev );
  }

  /**
   * @param eventName
   * @param ev
   * @private
   */
  _sendEvent (eventName, ev) {
    if (this.isOffscreenCanvas) {
      const transferableEvent = this._transferableEvent( ev );

      this.worker.postMessage({
        type: TelechartWorkerEvents.MAIN_CANVAS_EVENT,
        eventName,
        event: transferableEvent
      });
    } else {
      this.telechart.mainCanvasEvent( eventName, ev );
    }
  }

  /**
   * @param ev
   * @return {{pageY: number, pageX: number}}
   * @private
   */
  _transferableEvent (ev) {
    const isTouchEvent = !!ev.targetTouches && ev.targetTouches.length;
    const touch = isTouchEvent
      ? ev.targetTouches[ 0 ]
      : ev;

    const result = {
      pageX: touch.pageX,
      pageY: touch.pageY
    };

    return isTouchEvent ? {
      targetTouches: [ result ]
    } : result;
  }
}
