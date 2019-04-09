// import './style/telechart.scss';

import { AnimationSource, AnimationSourceEvents } from './core/animation/AnimationSource';
import { Clock } from './core/misc/Clock';
import { ChartThemes } from './utils/themes';
import { Chart } from './core/chart2/Chart';
import { EventEmitter } from './core/misc/EventEmitter';
// import { Chart } from './core/chart/Chart';
// import { NavigatorChart } from './core/chart/NavigatorChart';
// import { LabelButtons } from './core/chart/LabelButtons';

/*import { ChartEvents } from './core/chart/events/ChartEvents';
import { NavigatorChartEvents } from './core/chart/events/NavigatorChartEvents';*/

// import { ChartThemes } from "./utils";

let TELECHART_ID = 1;

const isWorker = typeof self !== 'undefined';

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
  canvas = null;

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
   * @type {LabelButtons}
   * @private
   */
  _labelButtons = null;

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
   * @type {AnimationSource}
   * @private
   */
  _animationSource = null;

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
   * @static
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   * @param environmentOptions
   */
  static create (canvas, options = {}, environmentOptions = {}) {
    const chart = new Telechart2();

    chart.setOptions( options );
    chart.setRenderer( canvas );
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
      devicePixelRatio = 1,
      canvasOffset,
      canvasWidth,
      canvasHeight
    } = options;

    this.environmentOptions = options;

    this.devicePixelRatio = devicePixelRatio;
    this.canvasOffset = canvasOffset;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    if (this.context) {
      this.updateContext();
      this.onResize();
    }
  }

  onResize () {
    this.emit( 'resize' );
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  setRenderer (canvas) {
    this.canvas = canvas;
  }

  /**
   * Initialize the chart
   */
  initialize () {
    this.setTheme( this.options.theme || ChartThemes.default );
    this.setTitle( this.options.title );

    this.initializeContext();

    // create components
    this._createChart();
    // this._createNavigatorChart();
    // this._createLabelButtons();
    // this._addEventListeners();

    // create animation loop
    this._clock = new Clock();
    this._animationSource = new AnimationSource( 60, 1 ); // fps, timeScale
    this._animationSource.on(AnimationSourceEvents.UPDATE, deltaTime => {
      // recalculate context
      this.update( deltaTime );

      // render context
      this.render();
    });

    this.nextFrame();
  }

  /**
   * Animation loop
   */
  nextFrame () {
    const deltaTime = this._clock.getDelta();
    this._animationSource.update( deltaTime );

    this.global.requestAnimationFrame(_ => this.nextFrame());
  }

  /**
   * Update loop
   */
  update (deltaTime) {
    this._chart.update( deltaTime );
    // this._navigatorChart.update( deltaTime );
    // this._labelButtons.update( deltaTime );
  }

  render () {
    this._chart.render();
  }

  /**
   * @param {string} themeName
   */
  setTheme (themeName) {
    this._themeName = themeName;
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

  initializeContext () {
    this.context = this.canvas.getContext( '2d' );

    // downscale to provide hidpi picture
    this.context.scale( this.devicePixelRatio, this.devicePixelRatio );
  }

  updateContext () {
    if (isWorker) {
      this.canvas.width = this.canvasWidth * this.devicePixelRatio;
      this.canvas.height = this.canvasHeight * this.devicePixelRatio;
    }

    // downscale to provide hidpi picture
    this.context.scale( this.devicePixelRatio, this.devicePixelRatio );
  }

  /**
   * @return {string}
   */
  get themeName () {
    return this._themeName;
  }

  /**
   * @return {DedicatedWorkerGlobalScope | Window}
   */
  get global () {
    return isWorker
      ? self : window;
  }

  /**
   * @private
   */
  _createChart () {
    this._chart = new Chart( this, this.options );
    this._chart.initialize();
  }

  /**
   * @private
   */
  _createNavigatorChart () {
    this._navigatorChart = new NavigatorChart( this );
    this._navigatorChart.initialize();
  }

  /**
   * @private
   */
  _createLabelButtons () {
    this._labelButtons = new LabelButtons( this );
    this._labelButtons.initialize();
  }

  /**
   * @private
   */
  _addEventListeners () {
    this._chart.on(ChartEvents.SERIES_VISIBLE_CHANGE, line => {
      this._navigatorChart.toggleSeries( line.label );
    });

    this._navigatorChart.on(NavigatorChartEvents.RANGE_CHANGED, range => {
      this._chart.setNavigationRange( ...range );
    });

    this._navigatorChart.on(NavigatorChartEvents.ANIMATE_RANGE, range => {
      this._chart.animateNavigationRangeTo( ...range );
    });
  }
}
