import TelechartWorker from '../worker/telechart.worker';
import { TelechartWorkerEvents } from '../worker/worker-events';
import { EventEmitter } from '../misc/EventEmitter';
import { createTelechart } from './misc/createTelechart';
import { LabelButtons } from '../ui/LabelButtons';
import { DataLabel } from '../ui/DataLabel';

import {
  addClass, animationTimeout, arraysEqual,
  ChartThemes,
  ChartVariables, clampNumber,
  createElement, cssText, debounce, DprSampling, getDevicePixelRatio, getElementOffset,
  getElementWidth, interpolateThemeClass,
  isOffscreenCanvasSupported, isTouchEventsSupported, isTransformSupported, months, passiveIfSupported, removeClass,
  resolveElement, setAttributes, throttle, zeroFill
} from '../../utils';

const NavUIComponent = {
  SLIDER: {
    LEFT_BORDER: 1,
    RIGHT_BORDER: 2,
    INNER: 3
  },
  OVERLAY: {
    LEFT: 4,
    RIGHT: 5
  }
};

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
  axisCanvas = null;

  /**
   * @type {HTMLCanvasElement}
   */
  uiCanvas = null;

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
   * @type {number[]}
   */
  navigationRange = [ 0, 1 ];

  /**
   * @type {number[]}
   */
  navigationRangeX = null;

  /**
   * @param {string | Element} mountTo
   * @param options
   */
  createChart (mountTo, options) {
    const container = resolveElement( mountTo );

    this.hasPercentage = options.series.percentage || false;

    const root = this.rootElement = this._createRoot( container );
    const header = this.headerElement = this._createHeader( root );

    root.appendChild( header );

    const mainCanvas = this.mainCanvas = this._createMainCanvas();
    const axisCanvas = this.axisCanvas = this._createAxisCanvas();
    const uiCanvas = this.uiCanvas = this._createUICanvas();
    const navigationSeriesCanvas = this.navigationSeriesCanvas = this._createNavigationSeriesCanvas();
    const navigationUICanvas = this.navigationUICanvas = this._createNavigationUICanvas();

    const mainCanvasRoot = this.mainCanvasRoot = this._createMainCanvasRoot( root );
    mainCanvasRoot.appendChild( mainCanvas );
    mainCanvasRoot.appendChild( axisCanvas );
    mainCanvasRoot.appendChild( uiCanvas );

    const navigatorRoot = this.navigatorRoot = this._createNavigatorRoot( root );
    navigatorRoot.appendChild( navigationSeriesCanvas );
    navigatorRoot.appendChild( navigationUICanvas );

    this._updateMainCanvasDimensions( mainCanvas );
    this._updateAxisCanvasDimensions( axisCanvas );
    this._updateUICanvasDimensions( uiCanvas );
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
      const uiOffscreen = uiCanvas.transferControlToOffscreen();
      const navigationSeriesOffscreen = navigationSeriesCanvas.transferControlToOffscreen();
      const navigationUIOffscreen = navigationUICanvas.transferControlToOffscreen();

      const worker = this.worker = new TelechartWorker();

      this._createLabelButtons();

      worker.postMessage({
        type: TelechartWorkerEvents.SETUP,
        mainCanvas: mainOffscreen,
        axisCanvas: axisOffscreen,
        uiCanvas: uiOffscreen,
        navigationSeriesCanvas: navigationSeriesOffscreen,
        navigationUICanvas: navigationUIOffscreen,
        settings
      }, [
        mainOffscreen,
        axisOffscreen,
        uiOffscreen,
        navigationSeriesOffscreen,
        navigationUIOffscreen
      ]);
    } else {
      this._createLabelButtons();

      this.telechart = createTelechart({
        mainCanvas,
        axisCanvas,
        uiCanvas,
        navigationSeriesCanvas,
        navigationUICanvas,
        api: this,
        settings
      });

      console.log( this.telechart );
    }

    this.setTitle( options.title );
    this.initializeDataLabel();
  }

  initialize () {
    this.addEventListeners();

    this._sendMainCanvasEventThrottled = throttle( this._sendMainCanvasEvent.bind( this ), 10 );
    this._sendNavUICanvasEventThrottled = this._sendNavUICanvasEvent.bind( this );

    if (!this._updateRangeViewThrottled) {
      this._updateRangeViewThrottled = debounce( this.updateRangeView.bind( this ), 50 );
    }
  }

  tick (deltaTime) {
    if (this.telechart) {
      this.telechart.update( deltaTime );
      this.telechart.render();
    }
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

  setNavigationRange (range, rangeX) {
    const oldRangeX = this.navigationRangeX;

    this.navigationRange = range;
    this.navigationRangeX = rangeX;

    if (arraysEqual( oldRangeX, rangeX )) {
      return;
    }

    if (!this._updateRangeViewThrottled) {
      this._updateRangeViewThrottled = debounce( this.updateRangeView.bind( this ), 50 );
    }

    this._updateRangeViewThrottled();
  }

  updateRangeView () {
    const chartWidth = this.environmentOptions && this.environmentOptions.canvasWidth || 500;

    const text = this._getRangeViewText( this.navigationRangeX, chartWidth < 400 );
    const updClassName = 'telechart2-range-view_updating';

    addClass( this.rangeViewElement, updClassName );

    return animationTimeout( 100 ).then(_ => {
      this.rangeViewElement.innerHTML = text;

      removeClass( this.rangeViewElement, updClassName );
    });
  }

  addEventListeners () {
    this._attachResizeListener();
    this._attachMainListeners();
    this._attachNavigatorListeners();

    if (this._resizeListener) {
      window.addEventListener('load', _ => this._resizeListener());
    }
  }

  initializeDataLabel () {
    const dataLabel = new DataLabel( this.rootElement );
    dataLabel.togglePercentage( this.hasPercentage );
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
    if (!this.dataLabel) {
      return;
    }
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
    this._updateUICanvasDimensions();
    this._updateNavigationSeriesCanvasDimensions();
    this._updateNavigationUICanvasDimensions();

    this._updateEnvironmentOptions();

    this.dataLabel.onResize();

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

    const devicePixelRatio = getDevicePixelRatio( DprSampling.main );

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

    const devicePixelRatio = getDevicePixelRatio( DprSampling.axis );

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
  _updateUICanvasDimensions (canvas = this.uiCanvas) {
    const parentNode = canvas.parentNode;

    this.uiCanvasWidth = clampNumber(
      getElementWidth( parentNode ),
      ChartVariables.minWidth
    );
    this.uiCanvasHeight = ChartVariables.mainMaxHeight;

    const devicePixelRatio = getDevicePixelRatio( DprSampling.ui );

    setAttributes(canvas, {
      style: cssText({
        width: `${this.uiCanvasWidth}px`,
        height: `${this.uiCanvasHeight}px`
      }),
      width: (devicePixelRatio * this.uiCanvasWidth) | 0,
      height: (devicePixelRatio * this.uiCanvasHeight) | 0
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

    const devicePixelRatio = getDevicePixelRatio( DprSampling.navSeries );

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

    const devicePixelRatio = getDevicePixelRatio( DprSampling.navUI );

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

    this.environmentOptions = environmentOptions;

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
   * @return {{axisCanvasOffset: {top: number, left: number}, canvasWidth: number, canvasOffset: {top: number, left: number}, uiCanvasHeight: *, navigationSeriesCanvasHeight: (number|*), uiCanvasOffset: {top: number, left: number}, navigationUICanvasHeight: (number|*), navigationUICanvasWidth: number, devicePixelRatio: number, axisCanvasHeight: *, uiCanvasWidth: number, canvasHeight: *, isTouchEventsSupported: boolean, isTransformSupported: *, navigationSeriesCanvasOffset: {top: number, left: number}, navigationSeriesCanvasWidth: (number|*), axisCanvasWidth: number, navigationUICanvasOffset: {top: number, left: number}}}
   * @private
   */
  _getEnvironmentOptions () {
    const canvasOffset = getElementOffset( this.mainCanvas );
    const canvasWidth = this.mainCanvasWidth;
    const canvasHeight = this.mainCanvasHeight;
    const canvasDpr = getDevicePixelRatio( DprSampling.main );

    const axisCanvasOffset = getElementOffset( this.axisCanvas );
    const axisCanvasWidth = this.axisCanvasWidth;
    const axisCanvasHeight = this.axisCanvasHeight;
    const axisCanvasDpr = getDevicePixelRatio( DprSampling.axis );

    const uiCanvasOffset = getElementOffset( this.uiCanvas );
    const uiCanvasWidth = this.uiCanvasWidth;
    const uiCanvasHeight = this.uiCanvasHeight;
    const uiCanvasDpr = getDevicePixelRatio( DprSampling.ui );

    const navigationSeriesCanvasOffset = getElementOffset( this.navigationSeriesCanvas );
    const navigationSeriesCanvasWidth = this.navigationSeriesCanvasWidth;
    const navigationSeriesCanvasHeight = this.navigationSeriesCanvasHeight;
    const navigationSeriesCanvasDpr = getDevicePixelRatio( DprSampling.navSeries );

    const navigationUICanvasOffset = getElementOffset( this.navigationUICanvas );
    const navigationUICanvasWidth = this.navigationUICanvasWidth;
    const navigationUICanvasHeight = this.navigationUICanvasHeight;
    const navigationUICanvasDpr = getDevicePixelRatio( DprSampling.navUI );

    return {
      // system
      isTouchEventsSupported: isTouchEventsSupported(),
      isTransformSupported: isTransformSupported(),

      // main canvas
      canvasOffset,
      canvasWidth,
      canvasHeight,
      canvasDpr,

      // axis canvas
      axisCanvasOffset,
      axisCanvasWidth,
      axisCanvasHeight,
      axisCanvasDpr,

      // axis canvas
      uiCanvasOffset,
      uiCanvasWidth,
      uiCanvasHeight,
      uiCanvasDpr,

      // navigation canvas series
      navigationSeriesCanvasOffset,
      navigationSeriesCanvasWidth,
      navigationSeriesCanvasHeight,
      navigationSeriesCanvasDpr,

      // navigation canvas UI
      navigationUICanvasOffset,
      navigationUICanvasWidth,
      navigationUICanvasHeight,
      navigationUICanvasDpr,
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
    this._createViewRange( header );

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

  _createViewRange (container) {
    const rangeViewElement = this.rangeViewElement = createElement('span', {
      attrs: {
        class: 'telechart2-range-view'
      }
    }, this._getRangeViewText( this.navigationRangeX ));

    container.appendChild( rangeViewElement );

    return rangeViewElement;
  }

  /**
   * @param {Array<number>} rangeX
   * @param short
   * @return {string}
   * @private
   */
  _getRangeViewText (rangeX, short = false) {
    if (!rangeX) {
      return '';
    }

    const firstDate = new Date( rangeX[0] );
    const secondDate = new Date( rangeX[1] );

    const f = this._toDateString( firstDate, short );
    const s = this._toDateString( secondDate, short );

    if (f === s) {
      return s;
    }

    return f + ' - ' + s;
  }

  /**
   * @param {Date} date
   * @param short
   * @return {string}
   * @private
   */
  _toDateString (date, short = true) {
    const monthText = short
      ? months[ date.getMonth() ].substr(0, 3)
      : months[ date.getMonth() ];
    const yearText = ' ' + date.getFullYear();

    return zeroFill( date.getDate() )
      + ' ' + monthText
      + yearText;
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
  _createUICanvas () {
    return createElement('canvas', {
      attrs: {
        class: 'telechart2-ui-canvas'
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
    }, passiveIfSupported( false ));
    this.mainCanvasRoot.addEventListener('touchmove', ev => {
      this._onMainCanvasTouchMove( ev );
    }, passiveIfSupported( false ));
    this.mainCanvasRoot.addEventListener('touchend', ev => {
      this._onMainCanvasTouchEnd( ev );
    });
  }

  _onMainCanvasMouseMove (ev) {
    this._sendMainCanvasEventThrottled( 'mousemove', ev );
  }

  _onMainCanvasMouseLeave (ev) {
    this._sendMainCanvasEventThrottled( 'mouseleave', ev );
  }

  _onMainCanvasTouchStart (ev) {
    const targetTouch = ev.targetTouches[ 0 ];

    this._touchStartPosition = {
      pageX: targetTouch.pageX,
      pageY: targetTouch.pageY
    };

    this._sendMainCanvasEventThrottled( 'touchstart', ev );
  }

  _onMainCanvasTouchMove (ev) {
    if (this._isScrollingAction === null) {
      const targetTouch = ev.targetTouches[ 0 ];

      const {
        pageX: startPageX,
        pageY: startPageY
      } = this._touchStartPosition;

      const deltaY = Math.abs( startPageY - targetTouch.pageY );
      const deltaX = Math.abs( startPageX - targetTouch.pageX );

      this._isScrollingAction = deltaY >= deltaX;
    }

    if (!this._isScrollingAction
      && ev.cancelable) {
      ev.preventDefault();
    }

    this._sendMainCanvasEventThrottled( 'touchmove', ev );
  }

  _onMainCanvasTouchEnd (ev) {
    this._isScrollingAction = null;

    if (ev.cancelable) {
      ev.preventDefault();
    }

    this._sendMainCanvasEventThrottled( 'touchend', ev );
  }

  /**
   * @param eventName
   * @param ev
   * @private
   */
  _sendMainCanvasEvent (eventName, ev) {
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

  _attachNavigatorListeners () {
    this.navigationUICanvas.addEventListener( 'touchstart', ev => this._onNavUICanvasTouchStart( ev ), passiveIfSupported( false ) );
    this.navigationUICanvas.addEventListener( 'touchmove', ev => this._onNavUICanvasTouchMove( ev ), passiveIfSupported( false ) );
    this.navigationUICanvas.addEventListener( 'touchend', ev => this._onNavUICanvasTouchEnd( ev ) );

    this.navigationUICanvas.addEventListener('mousedown', ev => this._onNavUICanvasMouseDown( ev ));
    this.navigationUICanvas.addEventListener('mousemove', ev => this._onNavUICanvasMouseMove( ev ));
    this.navigationUICanvas.addEventListener('click', ev => this._onNavUICanvasClick( ev ));

    // worker events
    if (this.worker) {
      const eventEmitter = new EventEmitter();

      this.worker.addEventListener('message', ev => {
        const type = ev.data.type;
        eventEmitter.emit( type, ev );
      });

      eventEmitter.on(TelechartWorkerEvents.SET_NAVIGATION_RANGE, ev => {
        const { range, rangeX } = ev.data;
        this.setNavigationRange( range, rangeX );
      });
    }
  }

  /**
   * @param eventName
   * @param ev
   * @param args
   * @private
   */
  _sendNavUICanvasEvent (eventName, ev, args = []) {
    if (this.isOffscreenCanvas) {
      const transferableEvent = this._transferableEvent( ev );

      this.worker.postMessage({
        type: TelechartWorkerEvents.NAV_UI_CANVAS_EVENT,
        eventName,
        event: transferableEvent,
        args
      });
    } else {
      this.telechart.navUICanvasEvent( eventName, ev, args );
    }
  }

  _onNavUICanvasMouseDown (ev) {
    // on mouse down
    const { component } = this._detectNavUIComponent( ev );

    this._currentNavComponent = component;

    if (component === NavUIComponent.SLIDER.LEFT_BORDER
      || component === NavUIComponent.SLIDER.RIGHT_BORDER) {
      return this._onSliderControllerMouseDown( ev, component === NavUIComponent.SLIDER.LEFT_BORDER ? 'left' : 'right' );
    }

    if (component === NavUIComponent.SLIDER.INNER) {
      return this._onSliderMouseDown( ev );
    }
  }

  _onNavUICanvasMouseMove (ev) {
    let newCursor = null;

    if (!this._navUIDragStarted) {
      const cursorAttrs = (cursor = 'default') => {
        return {
          style: `cursor: ${cursor}`
        };
      };

      const oldCursor = this.currentNavCursor;

      const { component } = this._detectNavUIComponent( ev );

      if (component === NavUIComponent.SLIDER.LEFT_BORDER
        || component === NavUIComponent.SLIDER.RIGHT_BORDER) {
        newCursor = 'e-resize';
      }

      if (component === NavUIComponent.SLIDER.INNER) {
        newCursor = 'grab';
      }

      if (component === NavUIComponent.OVERLAY.LEFT
        || component === NavUIComponent.OVERLAY.RIGHT) {
        newCursor = 'pointer';
      }

      if (newCursor !== oldCursor) {
        if (newCursor === 'grab') {
          addClass( this.navigatorRoot, 'grabbable' );
          setAttributes( this.navigatorRoot, { style: '' } );
        } else {
          removeClass( this.navigatorRoot, 'grabbable' );
          setAttributes( this.navigatorRoot, cursorAttrs( newCursor ) );
        }
      }
    }

    if (!newCursor) {
      setAttributes( this.navigatorRoot, { style: '' } );
      removeClass( this.navigatorRoot, 'grabbable' );
    }

    this.currentNavCursor = newCursor;
  }

  _onNavUICanvasTouchStart (ev) {
    // on touch start

    const {
      pageX, pageY
    } = ev.targetTouches[ 0 ];

    this._sliderStartEvent = {
      pageX, pageY
    };

    const { component } = this._detectNavUIComponent( ev );

    this._currentNavComponent = component;

    if (component === NavUIComponent.SLIDER.LEFT_BORDER
      || component === NavUIComponent.SLIDER.RIGHT_BORDER) {
      return this._onSliderControllerTouchStart( ev, component === NavUIComponent.SLIDER.LEFT_BORDER ? 'left' : 'right' );
    }

    if (component === NavUIComponent.SLIDER.INNER) {
      return this._onSliderTouchStart( ev );
    }
  }

  _onNavUICanvasTouchMove (ev) {
    // on touch move

    const targetTouch = ev.targetTouches[ 0 ];

    if (this._isSliderScrollingAction === null) {
      const {
        pageX: startPageX,
        pageY: startPageY
      } = this._sliderStartEvent;

      const deltaY = Math.abs( startPageY - targetTouch.pageY );
      const deltaX = Math.abs( startPageX - targetTouch.pageX );

      this._isSliderScrollingAction = deltaY >= deltaX;
    }

    if (!this._isSliderScrollingAction) {
      ev.preventDefault();
    }

    const component = this._currentNavComponent;

    if (component === NavUIComponent.SLIDER.LEFT_BORDER
      || component === NavUIComponent.SLIDER.RIGHT_BORDER) {
      return this._onSliderControllerTouchMove( ev );
    }

    if (component === NavUIComponent.SLIDER.INNER) {
      return this._onSliderTouchMove( ev );
    }
  }

  _onNavUICanvasTouchEnd (ev) {
    // on touch end

    const component = this._currentNavComponent;
    const eventCancelNeeded = component === NavUIComponent.SLIDER.INNER
      || component === NavUIComponent.SLIDER.RIGHT_BORDER
      || component === NavUIComponent.SLIDER.LEFT_BORDER;

    if (eventCancelNeeded && ev.cancelable) {
      ev.preventDefault();
    }

    this._isSliderScrollingAction = null;
    this._currentNavComponent = null;
    this._clearNavDragState();
  }

  _onNavUICanvasClick (ev) {
    // on click

    const { component, scaledPosition } = this._detectNavUIComponent( ev );

    this._currentNavComponent = component;

    if (component === NavUIComponent.OVERLAY.LEFT
      || component === NavUIComponent.OVERLAY.RIGHT) {
      return this._onSliderOverlayClick( ev, scaledPosition );
    }
  }

  /**
   * @param ev
   * @return {{pageY: *, pageX: *}}
   * @private
   */
  _getEventTouch (ev) {
    return ev.targetTouches && ev.targetTouches.length
      ? ev.targetTouches[ 0 ] : ev;
  }

  /**
   * @param ev
   * @private
   */
  _detectNavUIComponent (ev) {
    const wrapComponent = component => {
      return {
        scaledPosition,
        component
      };
    };

    const { pageX } = this._getEventTouch( ev );
    const env = this.environmentOptions;

    if (!env) {
      return wrapComponent( 0 );
    }

    const uiOffset = env.navigationUICanvasOffset;
    const uiWidth = env.navigationUICanvasWidth;

    const offsetX = pageX - uiOffset.left;

    const [ min, max ] = this.navigationRange;

    const realWidth = uiWidth - 2 * ChartVariables.chartPaddingLeftRight;
    const cursorX = offsetX - ChartVariables.chartPaddingLeftRight;
    const scaledPosition = cursorX / realWidth;

    const borderWidth = 9;
    const borderTapArea = borderWidth * 2;

    const leftBorderOffsetX = realWidth * min + borderWidth / 2;
    const rightBorderOffsetX = realWidth * max - borderWidth / 2;

    const leftMinX = leftBorderOffsetX - borderTapArea;
    const leftMaxX = leftBorderOffsetX + borderTapArea / 2;

    if (leftMinX <= cursorX && cursorX <= leftMaxX) {
      return wrapComponent( NavUIComponent.SLIDER.LEFT_BORDER );
    }

    const rightMinX = rightBorderOffsetX - borderTapArea / 2;
    const rightMaxX = rightBorderOffsetX + borderTapArea;

    if (rightMinX <= cursorX && cursorX <= rightMaxX) {
      return wrapComponent( NavUIComponent.SLIDER.RIGHT_BORDER );
    }

    if (leftBorderOffsetX <= cursorX && cursorX <= rightBorderOffsetX) {
      return wrapComponent( NavUIComponent.SLIDER.INNER );
    }

    if (0 <= cursorX && cursorX <= leftBorderOffsetX) {
      return wrapComponent( NavUIComponent.OVERLAY.LEFT );
    }

    if (rightBorderOffsetX <= cursorX && cursorX <= realWidth) {
      return wrapComponent( NavUIComponent.OVERLAY.RIGHT );
    }

    return wrapComponent( 0 );
  }

  /**
   * @param ev
   * @param scaledPosition
   * @private
   */
  _onSliderOverlayClick (ev, scaledPosition) {
    if (this._navUIDragStarted) {
      return;
    }
    // don't set drag state to true (!)

    this._sendNavUICanvasEventThrottled( 'overlay.click', this._transferableEvent( ev ), [ scaledPosition ] );
  }

  /**
   * @param ev
   * @private
   */
  _onSliderMouseDown (ev) {
    if (this._navUIDragStarted) {
      return;
    }
    this._navUIDragStarted = true;

    const mouseMoveListener = this._onSliderMouseMove.bind( this );

    const lastBodyStyle = document.body.getAttribute( 'style' );
    const styleAttr = {
      style: cssText({
        cursor: 'grabbing'
      })
    };

    setAttributes( document.body, styleAttr );

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', ev => {
      if (lastBodyStyle) {
        setAttributes(document.body, { style: lastBodyStyle });
      } else {
        document.body.removeAttribute( 'style' );
      }

      document.removeEventListener( 'mousemove', mouseMoveListener );

      // clear up current drag state
      this._clearNavDragState();
    });

    this._sendNavUICanvasEventThrottled( 'slider.mousedown', this._transferableEvent( ev ) );
  }

  _onSliderMouseMove (ev) {
    ev.preventDefault();

    this._sendNavUICanvasEventThrottled( 'slider.mousemove', this._transferableEvent( ev ) );
  }

  _onSliderTouchStart (ev) {
    if (this._navUIDragStarted) {
      return;
    }
    this._navUIDragStarted = true;

    this._sendNavUICanvasEventThrottled( 'slider.touchstart', this._transferableEvent( ev ) );
  }

  _onSliderTouchMove (ev) {
    this._sendNavUICanvasEventThrottled( 'slider.touchmove', this._transferableEvent( ev ) );
  }

  /**
   * @param ev
   * @param direction
   * @private
   */
  _onSliderControllerMouseDown (ev, direction) {
    if (this._navUIDragStarted) {
      return;
    }
    this._navUIDragStarted = true;

    const mouseMoveListener = this._onSliderControllerMouseMove.bind( this );

    const lastBodyStyle = document.body.getAttribute( 'style' );
    const styleAttr = {
      style: cssText({
        cursor: 'e-resize'
      })
    };

    setAttributes( document.body, styleAttr );

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', ev => {
      if (lastBodyStyle) {
        setAttributes(document.body, { style: lastBodyStyle });
      } else {
        document.body.removeAttribute( 'style' );
      }

      document.removeEventListener( 'mousemove', mouseMoveListener );

      // clear up current drag state
      this._clearNavDragState();
    });

    this._sendNavUICanvasEventThrottled( 'slider-controller.mousedown', this._transferableEvent( ev ), [ direction ] );
  }

  /**
   * @param ev
   * @private
   */
  _onSliderControllerMouseMove (ev) {
    ev.preventDefault();

    this._sendNavUICanvasEventThrottled( 'slider-controller.mousemove', this._transferableEvent( ev ) );
  }

  /**
   * @param ev
   * @param direction
   * @private
   */
  _onSliderControllerTouchStart (ev, direction) {
    if (this._navUIDragStarted) {
      return;
    }
    this._navUIDragStarted = true;

    this._sendNavUICanvasEventThrottled( 'slider-controller.touchstart', this._transferableEvent( ev ), [ direction ] );
  }

  _onSliderControllerTouchMove (ev) {
    this._sendNavUICanvasEventThrottled( 'slider-controller.touchmove', this._transferableEvent( ev ) );
  }

  /**
   * @private
   */
  _clearNavDragState (withDelay = true) {
    if (!withDelay) {
      return ( this._navUIDragStarted = false );
    }

    setTimeout(_ => {
      this._navUIDragStarted = false;
    }, 10);
  }
}
