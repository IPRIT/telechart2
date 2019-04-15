import { Clock } from './core/misc/Clock';
import { ChartThemes, Colors } from './utils/themes';
import { Chart } from './core/chart2/Chart';
import { EventEmitter } from './core/misc/EventEmitter';
import { NavigatorChart } from './core/chart2/NavigatorChart';
import { ChartEvents } from './core/chart2/events/ChartEvents';
import { NavigatorChartEvents } from './core/chart2/events/NavigatorChartEvents';
import { TelechartWorkerEvents } from './core/worker/worker-events';
// import { Chart } from './core/chart/Chart';
// import { NavigatorChart } from './core/chart/NavigatorChart';
// import { LabelButtons } from './core/chart/LabelButtons';

/*import { ChartEvents } from './core/chart/events/ChartEvents';
import { NavigatorChartEvents } from './core/chart/events/NavigatorChartEvents';*/

// import { ChartThemes } from "./utils";

let TELECHART_ID = 1;

export let isWorker = false;
try {
  isWorker = typeof window === 'undefined';
} catch (e) {
  isWorker = true;
}

export class Telechart2 extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = TELECHART_ID++;

  /**
   * @type {Object}
   */
  options = null;

  /**
   * @type {Object}
   */
  environmentOptions = null;

  /**
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @private
   */
  mainCanvas = null;

  /**
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @private
   */
  axisCanvas = null;

  /**
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @private
   */
  uiCanvas = null;

  /**
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @private
   */
  navigationSeriesCanvas = null;

  /**
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @private
   */
  navigationUICanvas = null;

  /**
   * @type {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D}
   */
  context = null;

  /**
   * @type {Chart}
   * @private
   */
  _chart = null;

  /**
   * @type {NavigatorChart}
   * @private
   */
  _navigatorChart = null;

  /**
   * @type {string}
   * @private
   */
  _themeName = ChartThemes.default;

  /**
   * @type {string}
   * @private
   */
  _title = '';

  /**
   * @type {Clock}
   * @private
   */
  _clock = null;

  /**
   * @type {number}
   */
  devicePixelRatio = 1;

  /**
   * @type {{top: number, left: number}}
   */
  canvasOffset = {
    top: 0,
    left: 0
  };

  /**
   * @type {{top: number, left: number}}
   */
  axisCanvasOffset = {
    top: 0,
    left: 0
  };

  /**
   * @type {{top: number, left: number}}
   */
  navigationSeriesCanvasOffset = {
    top: 0,
    left: 0
  };

  /**
   * @type {{top: number, left: number}}
   */
  navigationUICanvasOffset = {
    top: 0,
    left: 0
  };

  /**
   * @type {TelechartApi}
   */
  dedicatedApi = null;

  /**
   * @type {boolean}
   */
  forceRedraw = false;

  /**
   * @static
   * @param {HTMLCanvasElement} mainCanvas
   * @param {HTMLCanvasElement} axisCanvas
   * @param {HTMLCanvasElement} uiCanvas
   * @param {HTMLCanvasElement} navigationSeriesCanvas
   * @param {HTMLCanvasElement} navigationUICanvas
   * @param {TelechartApi} api
   * @param {Object} options
   * @param environmentOptions
   */
  static create ({ mainCanvas, axisCanvas, uiCanvas, navigationSeriesCanvas, navigationUICanvas, api }, options = {}, environmentOptions = {}) {
    const chart = new Telechart2();

    // only in windowed context
    chart.dedicatedApi = api;

    chart.setOptions( options );

    chart.setMainCanvas( mainCanvas );
    chart.setAxisCanvas( axisCanvas );
    chart.setUICanvas( uiCanvas );
    chart.setNavigationSeriesCanvas( navigationSeriesCanvas );
    chart.setNavigationUICanvas( navigationUICanvas );

    chart.setEnvironmentOptions( environmentOptions );
    chart.initialize();

    return chart;
  }

  /**
   * @param {Object} options
   */
  setOptions (options = {}) {
    this.options = options;
  }

  /**
   * @param options
   */
  setEnvironmentOptions (options = {}) {
    const {
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

      // ui canvas
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
    } = options;

    this.environmentOptions = options;

    this.canvasOffset = canvasOffset;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.canvasDpr = canvasDpr;

    this.axisCanvasOffset = axisCanvasOffset;
    this.axisCanvasWidth = axisCanvasWidth;
    this.axisCanvasHeight = axisCanvasHeight;
    this.axisCanvasDpr = axisCanvasDpr;

    this.uiCanvasOffset = uiCanvasOffset;
    this.uiCanvasWidth = uiCanvasWidth;
    this.uiCanvasHeight = uiCanvasHeight;
    this.uiCanvasDpr = uiCanvasDpr;

    this.navigationSeriesCanvasOffset = navigationSeriesCanvasOffset;
    this.navigationSeriesCanvasWidth = navigationSeriesCanvasWidth;
    this.navigationSeriesCanvasHeight = navigationSeriesCanvasHeight;
    this.navigationSeriesCanvasDpr = navigationSeriesCanvasDpr;

    this.navigationUICanvasOffset = navigationUICanvasOffset;
    this.navigationUICanvasWidth = navigationUICanvasWidth;
    this.navigationUICanvasHeight = navigationUICanvasHeight;
    this.navigationUICanvasDpr = navigationUICanvasDpr;

    if (this.mainContext) {
      this.updateContexts();

      // fire resize event if we have any context
      this.onResize();
    }
  }

  onResize () {
    this.emit( 'resize' );
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setMainCanvas (canvas) {
    this.mainCanvas = canvas;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setAxisCanvas (canvas) {
    this.axisCanvas = canvas;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setUICanvas (canvas) {
    this.uiCanvas = canvas;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setNavigationSeriesCanvas (canvas) {
    this.navigationSeriesCanvas = canvas;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setNavigationUICanvas (canvas) {
    this.navigationUICanvas = canvas;
  }

  /**
   * Initialize the chart
   */
  initialize () {
    this.setTheme( this.options.theme || ChartThemes.default );
    this.setTitle( this.options.title );

    this.initializeContexts();

    // create components
    this._createChart();
    this._createNavigatorChart();
    this._addEventListeners();

    this.initializeButtons();

    // create animation loop
    this._clock = new Clock();

    if (isWorker) {
      this.nextFrame();
    }
  }

  /**
   * Animation loop
   */
  nextFrame () {
    const deltaTime = this._clock.getDelta();

    // update context
    this.update( deltaTime );

    // render context
    this.render();

    this.global.requestAnimationFrame(_ => this.nextFrame());
  }

  /**
   * Update loop
   */
  update (deltaTime) {
    this._chart.update( deltaTime );
    this._navigatorChart.update( deltaTime );
  }

  render () {
    if (this._chart) {
      this._chart.render();
    }

    if (this._navigatorChart) {
      this._navigatorChart.render();
    }

    this.forceRedraw = false;
  }

  /**
   * @param {string} themeName
   */
  setTheme (themeName) {
    this._themeName = themeName;

    this.forceRedraw = true;

    this.render();

    if (this._chart) {
      this._chart._updateLabel();
    }
  }

  /**
   * @param {string} title
   */
  setTitle (title) {
    this._title = title;
  }

  /**
   * Destroys the chart instance
   */
  destroy () {
  }

  initializeContexts () {
    this.mainContext = this.mainCanvas.getContext( '2d' );
    this.axisContext = this.axisCanvas.getContext( '2d' );
    this.uiContext = this.uiCanvas.getContext( '2d' );
    this.navigationSeriesContext = this.navigationSeriesCanvas.getContext( '2d' );
    this.navigationUIContext = this.navigationUICanvas.getContext( '2d' );

    this.updateContextsScale();
  }

  updateContexts () {
    if (isWorker) {
      this.mainCanvas.width = this.canvasWidth * this.canvasDpr;
      this.mainCanvas.height = this.canvasHeight * this.canvasDpr;

      this.axisCanvas.width = this.axisCanvasWidth * this.axisCanvasDpr;
      this.axisCanvas.height = this.axisCanvasHeight * this.axisCanvasDpr;

      this.uiCanvas.width = this.uiCanvasWidth * this.uiCanvasDpr;
      this.uiCanvas.height = this.uiCanvasHeight * this.uiCanvasDpr;

      this.navigationSeriesCanvas.width = this.navigationSeriesCanvasWidth * this.navigationSeriesCanvasDpr;
      this.navigationSeriesCanvas.height = this.navigationSeriesCanvasHeight * this.navigationSeriesCanvasDpr;

      this.navigationUICanvas.width = this.navigationUICanvasWidth * this.navigationUICanvasDpr;
      this.navigationUICanvas.height = this.navigationUICanvasHeight * this.navigationUICanvasDpr;
    }

    this.updateContextsScale();
  }

  updateContextsScale () {
    // downscale to provide hidpi picture
    this.mainContext.scale( this.canvasDpr, this.canvasDpr );
    this.axisContext.scale( this.axisCanvasDpr, this.axisCanvasDpr );
    this.uiContext.scale( this.uiCanvasDpr, this.uiCanvasDpr );
    this.navigationSeriesContext.scale( this.navigationSeriesCanvasDpr, this.navigationSeriesCanvasDpr );
    this.navigationUIContext.scale( this.navigationUICanvasDpr, this.navigationUICanvasDpr );
  }

  initializeButtons () {
    const buttons = this._getLines();

    if (isWorker) {
      this.global.postMessage({
        type: TelechartWorkerEvents.INITIALIZE_BUTTONS,
        buttons
      });
    } else {
      this.dedicatedApi.initializeButtons( buttons );
    }
  }

  updateButtons () {
    const buttons = this._getLines();

    if (isWorker) {
      this.global.postMessage({
        type: TelechartWorkerEvents.UPDATE_BUTTONS,
        buttons
      });
    } else {
      this.dedicatedApi.updateButtons( buttons );
    }
  }

  mainCanvasEvent (eventName, event) {
    this._chart.emitEvent( eventName, event );
  }

  navUICanvasEvent (eventName, event, args = []) {
    this._navigatorChart.emitEvent( eventName, event, ...args );
  }

  /**
   * @return {string}
   */
  get themeName () {
    return this._themeName;
  }

  /**
   * @return {*}
   */
  get themeColors () {
    return Colors[ this._themeName ] || Colors.default;
  }

  /**
   * @return {DedicatedWorkerGlobalScope | Window}
   */
  get global () {
    return isWorker
      ? self : window;
  }

  /**
   * @return {boolean}
   */
  get isWorker () {
    return isWorker;
  }

  /**
   * @private
   */
  _createChart () {
    this._chart = new Chart( this, this.options );
    this._chart.initialize();

    if (this._chart.isStacked) {
      this._chartSumTree = this._chart.stackedSumTree;
    }
  }

  /**
   * @private
   */
  _createNavigatorChart () {
    this._navigatorChart = new NavigatorChart( this, this.options );

    if (this._chart.isStacked) {
      // reusing stacked sum tree for navigator
      this._navigatorChart.stackedSumTree = this._chartSumTree;
    }

    this._navigatorChart.initialize();
  }

  /**
   * @private
   */
  _addEventListeners () {
    this._chart.on(ChartEvents.SERIES_VISIBLE_CHANGE, line => {
      line.isVisible
        ? this._navigatorChart.setSeriesVisible( line.label )
        : this._navigatorChart.setSeriesInvisible( line.label );
    });

    this._chart.on(ChartEvents.FORCE_BUTTONS_UPDATE, _ => {
      this.updateButtons();
    });

    this._navigatorChart.on(NavigatorChartEvents.RANGE_CHANGED, range => {
      this._chart.setNavigationRange( ...range );
    });

    this._navigatorChart.on(NavigatorChartEvents.ANIMATE_RANGE, range => {
      this._chart.animateNavigationRangeTo( ...range );
    });
  }

  /**
   * @return {{visible: boolean, color: string, name: string, label: string}[]}
   * @private
   */
  _getLines () {
    return this._chart.series.map(line => {
      return {
        color: line.color,
        name: line.name,
        label: line.label,
        visible: line.isVisible
      };
    });
  }
}
