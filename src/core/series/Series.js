import { EventEmitter } from '../misc/EventEmitter';
import { arrayMinMax } from '../../utils';
import { Tween, TweenEvents } from '../animation/Tween';
import { ChartTypes } from '../chart2/ChartTypes';
import { SeriesTypes } from './SeriesTypes';

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
  isMainChart = false;

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
   */
  xAxis = [];

  /**
   * @type {Array<number>}
   */
  yAxis = [];

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
   * @type {number}
   * @private
   */
  localMaxY = 0;

  /**
   * @type {number}
   * @private
   */
  localMinY = 0;

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
   * @type {number}
   */
  seriesIndex = -1;

  /**
   * @type {Tween}
   */
  opacityAnimation = null;

  /**
   * @type {string}
   */
  opacityAnimationType = null;

  /**
   * @param {Chart | BaseChart} chart
   * @param {*} settings
   * @param {number} index
   */
  constructor (chart, settings = {}, index) {
    super();

    this.chart = chart;
    this.seriesIndex = index;

    this.isMainChart = chart.chartType === ChartTypes.chart;

    this.settings = settings;
    this._parseSettings();
  }

  /**
   * Initializes series with options
   */
  initialize () {
    // this.updateGlobalExtremes();

    this.setType( SeriesTypes.line );
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

    if (this.opacityAnimation
      && this.opacityAnimation.isRunning) {
      this.opacityAnimation.update( deltaTime );
      pathUpdated = true;
    }

    if (pathUpdated) {
      this.chart.redrawChartNeeded = true;
    }
  }

  render (context = this.chart.telechart.mainContext, input) {
    if (!this.opacity) {
      return input;
    }

    const interval = this.chart._viewportPointsIndexes;

    if (!interval.length
      || interval[ 1 ] - interval[ 0 ] <= 0) {
      return input;
    }

    if (!input || input.length === 0) {
      input = []
    }

    return this.drawByInterval( context, interval, this.chart.viewportPointsStep, input );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   * @param {number} step
   * @param input
   */
  drawByInterval (context, interval, step = 1, input) {
    context.globalAlpha = this.opacity;
    context.strokeStyle = this._color;
    context.lineWidth = this.strokeWidth;
    context.lineJoin = 'bevel';
    context.lineCap = 'butt';
    context.beginPath();

    if (!this.chart.isYScaled || this.seriesIndex === 0) {
      this.drawPathToContext(context, interval, step);
    } else {
      this.drawPathToContext(context, interval, step, {
        viewportPixelY: this.chart.viewportPixelY2,
        currentLocalMinY: this.chart.currentLocalMinY2
      });
    }

    context.stroke();
  }

  /**
   * @param context
   * @param interval
   * @param step
   * @param settings
   * @private
   */
  drawPathToContext (context, interval, step = 1, settings = {}) {
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
      this.xAxis[ startIndex ] / viewportPixelX - dxOffset,
      chartBottomLineY - ( this.yAxis[ startIndex ] / viewportPixelY - dyOffset )
    );

    for (let i = startIndex + 1; i <= endIndex; i += step) {
      context.lineTo(
        this.xAxis[ i ] / viewportPixelX - dxOffset,
        chartBottomLineY - ( this.yAxis[ i ] / viewportPixelY - dyOffset )
      );
    }
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
      this.yAxis, rangeStartIndex, rangeEndIndex
    );

    this.localMinY = minValue;
    this.localMaxY = maxValue;
  }

  /**
   * @private
   */
  updateGlobalExtremes () {
    const [ minValue, maxValue ] = arrayMinMax(
      this.yAxis, 0, this.xAxis.length - 1
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
   * @param {string} type
   */
  setType (type) {
    this.type = type;
  }

  /**
   * @return {number}
   */
  get id () {
    return this._id;
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
   * @return {boolean}
   */
  get isShowing () {
    return this.opacityAnimationType === OpacityAnimationType.showing;
  }

  /**
   * @return {boolean}
   */
  get isHiding () {
    return this.opacityAnimationType === OpacityAnimationType.hiding;
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

    this.xAxis = xAxis;
    this.yAxis = yAxis;
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
  _createShowAnimation () {
    if (this.opacityAnimation
      && this.opacityAnimationType === OpacityAnimationType.showing) {
      return;
    }
    this._createOpacityAnimation( 1 );
    this.opacityAnimationType = OpacityAnimationType.showing;
  }

  /**
   * @private
   */
  _createHideAnimation () {
    if (this.opacityAnimation
      && this.opacityAnimationType === OpacityAnimationType.hiding) {
      return;
    }
    this._createOpacityAnimation( 0 );
    this.opacityAnimationType = OpacityAnimationType.hiding;
  }

  /**
   * @param {number} opacity
   * @private
   */
  _createOpacityAnimation (opacity) {
    const duration = 300;
    const timingFunction = this.chart.isPercentage ? 'easeInOutCubic' : 'easeInOutQuad';

    this.opacityAnimation = new Tween(this, 'opacity', opacity, {
      duration,
      timingFunction
    });

    const onFinished = _ => {
      this.opacityAnimation = null;
      this.opacityAnimationType = null;
      this.requestPathUpdate();
    };

    this.opacityAnimation.on( TweenEvents.COMPLETE, onFinished );
    this.opacityAnimation.on( TweenEvents.CANCELLED, onFinished );

    this.opacityAnimation.start();
  }
}
