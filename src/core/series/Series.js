import { EventEmitter } from '../misc/EventEmitter';
import { arrayMinMax } from '../../utils';
import { Point } from '../point/Point';
import { Tween, TweenEvents } from '../animation/Tween';
import { ChartTypes } from '../chart2/ChartTypes';

let SERIES_AUTOINCREMENT = 1;

export const OpacityAnimationType = {
  hiding: 1,
  showing: 2
};

export class Series extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = SERIES_AUTOINCREMENT++;

  /**
   * @type {Chart | BaseChart}
   */
  chart = null;

  /**
   * @type {boolean}
   * @private
   */
  isLineChart = false;

  /**
   * @type {{xAxis: Array<number>, yAxis: Array<number>, label: string, type: string, name: string, color: string, options: *}}
   * @private
   */
  settings = {};

  /**
   * @type {*}
   * @private
   */
  seriesOptions = {};

  /**
   * @type {Array<number>}
   * @private
   */
  _xAxis = [];

  /**
   * @type {Array<number>}
   * @private
   */
  _yAxis = [];

  /**
   * @type {string}
   * @private
   */
  _name = null;

  /**
   * @type {string}
   * @private
   */
  _label = null;

  /**
   * @type {string}
   * @private
   */
  _color = '#31a8dc';

  /**
   * @type {number}
   * @private
   */
  strokeWidth = 1;

  /**
   * @type {boolean}
   * @private
   */
  _visible = true;

  /**
   * @type {boolean}
   * @private
   */
  _pathUpdateNeeded = false;

  /**
   * @type {Array<Point>}
   * @private
   */
  _points = [];

  /**
   * @type {number}
   * @private
   */
  _localMaxY = 0;

  /**
   * @type {number}
   * @private
   */
  _localMinY = 0;

  /**
   * @type {number}
   * @private
   */
  _globalMaxY = 0;

  /**
   * @type {number}
   * @private
   */
  _globalMinY = 0;

  /**
   * @type {number}
   */
  opacity = 1;

  /**
   * @type {Tween}
   * @private
   */
  _opacityAnimation = null;

  /**
   * @type {string}
   * @private
   */
  _opacityAnimationType = null;

  /**
   * @param {Chart | BaseChart} chart
   * @param {*} settings
   */
  constructor (chart, settings = {}) {
    super();

    this.chart = chart;
    this.isLineChart = chart.chartType === ChartTypes.chart;

    this.settings = settings;
    this._parseSettings();
  }

  /**
   * Initializes series with options
   */
  initialize () {
    // this._createPoints();
    this.updateGlobalExtremes();
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    let pathUpdated = false;

    if (this._pathUpdateNeeded) {
      this._pathUpdateNeeded = false;
      pathUpdated = true;
    }

    if (this._opacityAnimation
      && this._opacityAnimation.isRunning) {
      this._opacityAnimation.update( deltaTime );
      pathUpdated = true;
    }

    if (pathUpdated) {
      this.chart.redrawChartNeeded = true;
    }
  }

  render (context = this.chart.telechart.mainContext) {
    this.draw( context );
  }

  draw (context) {
    this.drawPath( context );
  }

  drawPath (context) {
    if (!this.opacity) {
      return;
    }

    const interval = this.chart._viewportPointsIndexes;

    if (!interval.length
      || interval[ 1 ] - interval[ 0 ] <= 0) {
      return;
    }

    this.drawPathByInterval( context, interval, this.chart._viewportPointsStep );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   * @param {number} step
   */
  drawPathByInterval (context, interval, step = 1) {
    context.globalAlpha = this.opacity;
    context.strokeStyle = this._color;
    context.lineWidth = this.strokeWidth;
    context.lineJoin = 'bevel';
    context.lineCap = 'butt';
    context.beginPath();

    this._drawPathToContext( context, interval, step );

    context.stroke();
  }

  /**
   * Shows series on the chart
   */
  setVisible () {
    this._visible = true;
    this._createShowAnimation();

    this.emit( 'visibleChange', this._visible );
  }

  /**
   * Hides series from the chart
   */
  setInvisible () {
    this._visible = false;
    this._createHideAnimation();

    this.emit( 'visibleChange', this._visible );
  }

  /**
   * Toggles series
   */
  toggleVisible () {
    this._visible
      ? this.setInvisible()
      : this.setVisible();
  }

  /**
   * @private
   */
  updateLocalExtremes () {
    const [ rangeStartIndex, rangeEndIndex ] = this.chart._viewportRangeIndexes;

    const [ minValue, maxValue ] = arrayMinMax(
      this._yAxis, rangeStartIndex, rangeEndIndex
    );

    this._localMinY = minValue;
    this._localMaxY = maxValue;
  }

  /**
   * @private
   */
  updateGlobalExtremes () {
    const [ minValue, maxValue ] = arrayMinMax(
      this._yAxis, 0, this._xAxis.length - 1
    );

    this._globalMinY = minValue;
    this._globalMaxY = maxValue;
  }

  /**
   * Mark to update path in next animation frame
   */
  requestPathUpdate () {
    this._pathUpdateNeeded = true;
  }

  /**
   * @return {number}
   */
  get id () {
    return this._id;
  }

  /**
   * @return {Array<number>}
   */
  get xAxis () {
    return this._xAxis;
  }

  /**
   * @return {Array<number>}
   */
  get yAxis () {
    return this._yAxis;
  }

  /**
   * @return {string}
   */
  get label () {
    return this._label;
  }

  /**
   * @return {string}
   */
  get color () {
    return this._color;
  }

  /**
   * @return {string}
   */
  get name () {
    return this._name;
  }

  /**
   * @return {boolean}
   */
  get isVisible () {
    return this._visible;
  }

  /**
   * @return {number}
   */
  get localMinY () {
    return this._localMinY;
  }

  /**
   * @return {number}
   */
  get localMaxY () {
    return this._localMaxY;
  }

  /**
   * @return {number}
   */
  get globalMinY () {
    return this._globalMinY;
  }

  /**
   * @return {number}
   */
  get globalMaxY () {
    return this._globalMaxY;
  }

  /**
   * @return {string}
   */
  get opacityAnimationType () {
    return this._opacityAnimationType;
  }

  /**
   * @return {boolean}
   */
  get isShowing () {
    return this._opacityAnimationType === OpacityAnimationType.showing;
  }

  /**
   * @return {boolean}
   */
  get isHiding () {
    return this._opacityAnimationType === OpacityAnimationType.hiding;
  }

  /**
   * @private
   */
  _parseSettings () {
    const {
      xAxis, yAxis,
      label, type,
      color, name,
      options = {}
    } = this.settings;

    this._xAxis = xAxis;
    this._yAxis = yAxis;
    this._label = label;
    this._color = color;
    this._name = name;

    const {
      strokeWidth = 1
    } = options;

    this.strokeWidth = strokeWidth;

    this.seriesOptions = options;
  }

  /**
   * @private
   */
  _createPoints () {
    const xAxis = this._xAxis;
    const yAxis = this._yAxis;

    for (let i = 0; i < xAxis.length; ++i) {
      this._points.push(
        new Point( xAxis[ i ], yAxis[ i ] )
      );
    }
  }

  /**
   * @private
   */
  _createShowAnimation () {
    if (this._opacityAnimation
      && this._opacityAnimationType === OpacityAnimationType.showing) {
      return;
    }
    this._createOpacityAnimation( 1 );
    this._opacityAnimationType = OpacityAnimationType.showing;
  }

  /**
   * @private
   */
  _createHideAnimation () {
    if (this._opacityAnimation
      && this._opacityAnimationType === OpacityAnimationType.hiding) {
      return;
    }
    this._createOpacityAnimation( 0 );
    this._opacityAnimationType = OpacityAnimationType.hiding;
  }

  /**
   * @param {number} opacity
   * @private
   */
  _createOpacityAnimation (opacity) {
    this._opacityAnimation = new Tween(this, 'opacity', opacity, {
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });

    const onFinished = _ => {
      this._opacityAnimation = null;
      this._opacityAnimationType = null;
      this.requestPathUpdate();
    };

    this._opacityAnimation.on( TweenEvents.COMPLETE, onFinished );
    this._opacityAnimation.on( TweenEvents.CANCELLED, onFinished );

    this._opacityAnimation.start();
  }

  /**
   * @param context
   * @param interval
   * @param step
   * @param settings
   * @private
   */
  _drawPathToContext (context, interval, step = 1, settings = {}) {
    const {
      viewportRange = this.chart.viewportRange,
      viewportPixelX = this.chart.viewportPixelX,
      viewportPixelY = this.chart.viewportPixelY,
      currentLocalMinY = this.chart.currentLocalMinY
    } = settings || {};

    const [ startIndex, endIndex ] = interval;
    const [ minViewportX ] = viewportRange;

    const chartHeight = this.chart.chartHeight;
    const chartOffsetTop = this.chart.seriesOffsetTop;
    const chartBottomLineY = chartOffsetTop + chartHeight;

    const dxOffset = minViewportX / viewportPixelX;
    const dyOffset = currentLocalMinY / viewportPixelY;

    context.moveTo(
      this._xAxis[ startIndex ] / viewportPixelX - dxOffset,
      chartBottomLineY - ( this._yAxis[ startIndex ] / viewportPixelY - dyOffset )
    );

    for (let i = startIndex + 1; i <= endIndex; i += step) {
      context.lineTo(
        this._xAxis[ i ] / viewportPixelX - dxOffset,
        chartBottomLineY - ( this._yAxis[ i ] / viewportPixelY - dyOffset )
      );
    }
  }
}
