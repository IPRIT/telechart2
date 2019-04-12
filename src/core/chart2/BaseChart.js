import { TelechartWorkerEvents } from '../worker/worker-events';
import { EventEmitter } from '../misc/EventEmitter';
import { SeriesTypes } from '../series/SeriesTypes';
import { Series } from '../series/Series';
import { Tween, TweenEvents } from '../animation/Tween';
import { ChartTypes } from './ChartTypes';
import { ChartEvents } from './events/ChartEvents';
import { ChartAxisY } from './axis/ChartAxisY';
import { ChartAxisX } from './axis/ChartAxisX';

import {
  arraysEqual,
  binarySearchIndexes, ChartVariables,
  clampNumber,
  ensureNumber,
  isDate,
} from '../../utils';

let CHART_ID = 1;

export class BaseChart extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = CHART_ID++;

  /**
   * @type {string}
   * @private
   */
  _type = '';

  /**
   * @type {Telechart2}
   */
  telechart = null;

  /**
   * @type {Object}
   * @private
   */
  options = null;

  /**
   * @type {number}
   * @private
   * @default 2
   */
  _groupingPixels = 2;

  /**
   * @type {Array<number>}
   * @private
   */
  _xAxis = [];

  /**
   * @type {Array<Series>}
   * @private
   */
  _series = [];

  /**
   * @type {Array<number>}
   * @private
   */
  _viewportRange = [];

  /**
   * @type {Array<number>}
   * @private
   */
  _viewportRangeIndexes = [];

  /**
   * @type {Array<number>}
   */
  _viewportPointsIndexes = [ 0, 0 ];

  /**
   * @type {number}
   */
  _viewportPointsStep = 1;

  /**
   * @type {number}
   * @private
   */
  _viewportDistance = 0;

  /**
   * @type {number}
   * @private
   */
  _viewportPixelX = 0;

  /**
   * @type {number}
   * @private
   */
  _viewportPixelY = 0;

  /**
   * @type {number}
   * @private
   */
  _viewportPadding = 13;

  /**
   * @type {number}
   * @private
   */
  _viewportLeftPaddingScale = 0;

  /**
   * @type {number}
   * @private
   */
  _viewportRightPaddingScale = 0;

  /**
   * @type {boolean}
   * @private
   */
  _viewportRangeUpdateNeeded = false;

  /**
   * @type {boolean}
   * @private
   */
  _viewportPointsGroupingNeeded = false;

  /**
   * @type {number}
   * @private
   */
  _localMinY = 0;

  /**
   * @type {number}
   * @private
   */
  _localMaxY = 0;

  /**
   * @type {number}
   * @private
   */
  _globalMinY = 0;

  /**
   * @type {number}
   * @private
   */
  _globalMaxY = 0;

  /**
   * @type {number}
   * @private
   */
  _currentLocalMinY = null;

  /**
   * @type {number}
   * @private
   */
  _currentLocalMaxY = null;

  /**
   * @type {Tween}
   * @private
   */
  _minMaxYAnimation = null;

  /**
   * @type {number}
   * @private
   */
  _minMaxYAnimationSign = null;

  /**
   * @type {Tween}
   * @private
   */
  _rangeAnimation = null;

  /**
   * @type {*}
   * @private
   */
  _rangeAnimationObject = {};

  /**
   * @type {boolean}
   */
  cursorInsideChart = false;

  /**
   * @type {number}
   */
  axisCursorPositionX = 0;

  /**
   * @type {number}
   */
  axisCursorPointIndex = 0;

  /**
   * @type {ChartAxisY}
   * @private
   */
  _yAxisView = null;

  /**
   * @type {ChartAxisX}
   * @private
   */
  _xAxisView = null;

  /**
   * @type {boolean}
   */
  redrawChartNeeded = true;

  /**
   * @type {boolean}
   * @private
   */
  isYScaled = false;

  /**
   * @type {boolean}
   * @private
   */
  isPercentage = false;

  /**
   * @type {boolean}
   * @private
   */
  isStacked = false;

  /**
   * @param {Telechart2} context
   * @param {Object} options
   */
  constructor (context, options = {}) {
    super();

    this.telechart = context;
    this.options = options;
  }

  initialize () {
    this.createSeries();
    this.addEvents();

    this.setInitialRange();
    this.approximateViewportPoints();

    if (this.isChart) {
      this.initializeAxisY();
      this.initializeAxisX();
    }
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    let redrawChart = false;
    let redrawAxis = false;

    const minMaxYAnimation = this._minMaxYAnimation;
    const extremesUpdated = minMaxYAnimation && minMaxYAnimation.isRunning;

    if (extremesUpdated) {
      this._minMaxYAnimation.update( deltaTime );
      redrawChart = true;
      redrawAxis = true;
    }

    const hasRangeAnimation = this._rangeAnimation && this._rangeAnimation.isRunning;

    if (this._viewportRangeUpdateNeeded || hasRangeAnimation) {
      if (hasRangeAnimation) {
        this._rangeAnimation.update( deltaTime );

        this.updateViewportRange([
          this._rangeAnimationObject.from,
          this._rangeAnimationObject.to
        ], { skipExtremes: false });

      } else {
        this.updateViewportRange();
      }

      this._viewportRangeUpdateNeeded = false;
      redrawChart = true;
      redrawAxis = true;
    }

    if (this._viewportPointsGroupingNeeded) {
      this.approximateViewportPoints();

      this._viewportPointsGroupingNeeded = false;
    }

    if (extremesUpdated) {
      this.updateViewportPixel();
    }

    this.eachSeries(line => {
      const hasOpacityAnimation = line.isHiding || line.isShowing;

      if (extremesUpdated || hasOpacityAnimation) {
        line.requestPathUpdate();
        redrawChart = true;
      }

      line.update( deltaTime );
    });

    if (this._yAxisView) {
      if (redrawAxis) {
        this._yAxisView.requestRedraw();
      }

      this._yAxisView.update( deltaTime );
    }

    if (this._xAxisView) {
      if (redrawAxis) {
        this._xAxisView.requestRedraw();
      }

      this._xAxisView.update( deltaTime );
    }

    this.redrawChartNeeded = this.redrawChartNeeded || redrawChart;
  }

  render () {
    if (this.redrawChartNeeded || this.telechart.forceRedraw) {
      this.redrawChart();

      this.redrawChartNeeded = false;
    }

    if (this._yAxisView) {
      // clear rect inside
      this._yAxisView.render();
    }

    if (this._xAxisView) {
      this._xAxisView.render();
    }
  }

  /**
   * @abstract
   */
  redrawChart () {
  }

  /**
   * Creates array of series
   */
  createSeries () {
    const {
      series: data,
      seriesOptions: options = {}
    } = this.options || {};

    const groupingOptions = options.grouping;
    if (groupingOptions) {
      if (groupingOptions.pixels) {
        this._groupingPixels = ensureNumber( groupingOptions.pixels );
      }
    }

    const {
      columns,
      types,
      colors,
      names,
      y_scaled = false,
      percentage = false,
      stacked = false
    } = data;

    this.isYScaled = y_scaled;
    this.isPercentage = percentage;
    this.isStacked = stacked;

    const xAxisIndex = columns.findIndex(column => {
      return types[ column[ 0 ] ] === SeriesTypes.x;
    });
    const xAxis = this._xAxis = columns[ xAxisIndex ].slice( 1 );

    let yAxes = columns.slice(); // copy an array to change later
    yAxes.splice( xAxisIndex, 1 ); // remove x axis from the array

    for (let i = 0; i < yAxes.length; ++i) {
      const yAxis = yAxes[ i ].slice();
      const label = yAxis.shift();
      const type = types[ label ];
      const color = colors[ label ];
      const name = names[ label ];

      // prepare series settings
      const settings = {
        xAxis, yAxis, label, type,
        color, name, options: this.extendSeriesOptions( options )
      };

      // create instance
      const series = new Series( this, settings );
      series.initialize();

      this._series.push( series );
    }
  }

  /**
   * Creates y axis
   */
  initializeAxisY () {
    const yAxisView = new ChartAxisY( this, this.isYScaled );
    yAxisView.initialize();

    this._yAxisView = yAxisView;
  }

  /**
   * Creates y axis
   */
  initializeAxisX () {
    const xAxisView = new ChartAxisX( this );
    xAxisView.initialize();

    this._xAxisView = xAxisView;
  }

  /**
   * Sets initial viewport range for the chart
   */
  setInitialRange () {
    this.setViewportRange();
  }

  /**
   * @param {number} minX
   * @param {number} maxX
   * @param {*} options
   */
  animateViewportRangeTo (minX = -Infinity, maxX = Infinity, options = {}) {
    const {
      duration = 300,
      timingFunction = 'easeInOutQuad',
      preservePadding = false
    } = options;

    const [ newMinX, newMaxX ] = this._clampViewportRange( minX, maxX, preservePadding );

    if (this._rangeAnimation) {
      return this._rangeAnimation.patchAnimation( [ newMinX, newMaxX ] );
    }

    this._rangeAnimationObject = {
      from: this._viewportRange[ 0 ],
      to: this._viewportRange[ 1 ]
    };

    this._rangeAnimation = new Tween(this._rangeAnimationObject, [ 'from', 'to' ], [
      newMinX, newMaxX
    ], {
      duration, timingFunction
    });

    const onFinished = _ => {
      this._rangeAnimation = null;
    };

    this._rangeAnimation.on( TweenEvents.COMPLETE, onFinished );
    this._rangeAnimation.on( TweenEvents.CANCELLED, onFinished );

    this._rangeAnimation.start();
  }

  /**
   * @param {number|Date} minX
   * @param {number|Date} maxX
   * @param {boolean} skipExtremes
   * @param {boolean} preservePadding
   */
  setViewportRange (minX = -Infinity, maxX = Infinity, { skipExtremes = false, preservePadding = false } = {}) {
    // recompute X boundaries
    this._setViewportRange( minX, maxX, preservePadding );

    // remember last indexes
    const oldRangeIndexes = this._viewportRangeIndexes;

    // recompute indexes range
    this._updateViewportIndexes();

    let localExtremesUpdateRequested = false;

    if (!arraysEqual( this._viewportRangeIndexes, oldRangeIndexes )) {
      // do not recompute groups while first render
      if (oldRangeIndexes.length > 0) {
        // recompute approximation in next animation update
        this._viewportPointsGroupingNeeded = true;
      }

      if (this._xAxisView) {
        this._xAxisView.requestUpdateAnimations();
      }

      localExtremesUpdateRequested = true;
    }

    const updateExtremes = !skipExtremes && localExtremesUpdateRequested;

    this.eachSeries(line => {
      // update local extremes only if indexes range changed
      if (updateExtremes) {
        // update minY and maxY local values for each line
        line.updateLocalExtremes();
      }

      // recompute and repaint path in next animation update
      line.requestPathUpdate();
    });

    if (updateExtremes) {
      // update local extremes on chart level
      this.updateLocalExtremes();
    }

    // recompute pixel values
    this.updateViewportPixel();

    if (this._xAxisView) {
      this._xAxisView.requestUpdateAnimations();
    }

    this.emit( ChartEvents.REDRAW_CURSOR );
  }

  /**
   * Recompute key variables for viewport range
   *
   * @param {Array<number>} viewportRange
   * @param {*} options
   */
  updateViewportRange (viewportRange = this._viewportRange, options = {}) {
    const {
      skipExtremes = true,
      preservePadding = true
    } = options;

    // recompute X boundaries
    this.setViewportRange(
      viewportRange[ 0 ],
      viewportRange[ 1 ], {
        skipExtremes,
        preservePadding
      }
    );
  }

  /**
   * Approximate points for better performance
   */
  approximateViewportPoints () {
    let [ startIndex, endIndex ] = this._viewportRangeIndexes;

    startIndex = Math.max( 0, startIndex - 1 );
    endIndex = Math.min( this._xAxis.length - 1, endIndex + 1 );

    // if we have no enough points
    // then we don't need to approximate
    if (endIndex - startIndex < 100 && !this.isNavigatorChart) {
      // just save indexes of points for increase performance
      // [ startIndex, endIndex ]
      this._viewportPointsIndexes[ 0 ] = startIndex;
      this._viewportPointsIndexes[ 1 ] = endIndex;
      this._viewportPointsStep = 1;

      // all work done here
      return;
    }

    const boostLimit = 300;
    const boostScale = 1 + this._xAxis.length > boostLimit
      ? Math.max(0, ( endIndex - startIndex ) / this._xAxis.length )
      : 1;

    let groupingDistanceLimitX = boostScale * this._groupingPixels * this._viewportPixelX;

    let groupStartIndex = startIndex;

    let step = 1;

    for (let i = startIndex + 1; i <= endIndex; ++i) {
      const pointX = this._xAxis[ i ];

      const groupStartDifferenceX = pointX - this._xAxis[ groupStartIndex ];

      if (groupStartDifferenceX >= groupingDistanceLimitX || i === endIndex) {
        if (groupStartIndex !== i - 1) {
          // we have 2 or more points to group
          // [ startIndex, lastIndex ] all indexes inclusive
          const endIndex = i - 1;
          if (step === 1) {
            step = endIndex - groupStartIndex;
            break;
          }
        }
      }
    }

    step = 2 ** Math.floor( Math.log2( step ) );

    while (startIndex % step !== 0) {
      startIndex--;
    }

    while (endIndex % step !== 0) {
      endIndex++;
    }

    endIndex = Math.min( endIndex, this._xAxis.length - 1 );

    this._viewportPointsIndexes[ 0 ] = startIndex;
    this._viewportPointsIndexes[ 1 ] = endIndex;
    this._viewportPointsStep = step;
  }

  /**
   * Find new local min and max extremes among visible series
   */
  updateLocalExtremes () {
    let localMinY = Infinity;
    let localMaxY = 0;
    let globalMinY = Infinity;
    let globalMaxY = 0;

    this.eachSeries(line => {
      if (globalMinY > line.globalMinY) {
        globalMinY = line.globalMinY;
      }
      if (globalMaxY < line.globalMaxY) {
        globalMaxY = line.globalMaxY;
      }

      if (!line.isVisible) {
        // find among visible series
        return;
      }

      if (localMinY > line.localMinY) {
        localMinY = line.localMinY;
      }
      if (localMaxY < line.localMaxY) {
        localMaxY = line.localMaxY;
      }
    });

    let oldLocalMinY = this._localMinY;
    let oldLocalMaxY = this._localMaxY;

    this._localMinY = localMinY;
    this._localMaxY = localMaxY;

    this._globalMinY = globalMinY;
    this._globalMaxY = globalMaxY;

    let updateAnimation = false;

    if (typeof this._currentLocalMinY !== 'number') {
      // set initial local min y
      this._currentLocalMinY = this._localMinY;
    } else if (this._localMinY !== oldLocalMinY) {
      updateAnimation = true;
    }

    if (typeof this._currentLocalMaxY !== 'number') {
      // set initial local max y
      this._currentLocalMaxY = this._localMaxY;
    } else if (this._localMaxY !== oldLocalMaxY) {
      updateAnimation = true;
    }

    if (updateAnimation) {
      this._updateOrCreateMinMaxYAnimation();

      if (this._yAxisView) {
        this._yAxisView.requestUpdateAnimations();
      }
    }
  }

  /**
   * @param {number} minX
   * @param {number} maxX
   * @return {number}
   */
  computeViewportPixelX (minX = this._viewportRange[ 0 ], maxX = this._viewportRange[ 1 ]) {
    return ( maxX - minX ) / this.chartWidth;
  }

  /**
   * @param minY
   * @param maxY
   * @return {number}
   */
  computeViewportPixelY (minY = this._currentLocalMinY, maxY = this._currentLocalMaxY) {
    return ( maxY - minY ) / this.chartHeight;
  }

  /**
   * Updates pixel value for each axis
   */
  updateViewportPixel () {
    this._viewportPixelX = this._viewportDistance / this.chartWidth;
    this._viewportPixelY = this.currentLocalExtremeDifference / this.chartHeight;
  }

  /**
   * @param {number} localMinX
   * @param {number} localMaxX
   * @return {number}
   */
  computeViewportPadding (localMinX, localMaxX) {
    return this.computeViewportPixelX( localMinX, localMaxX ) * this._viewportPadding;
  }

  /**
   * Initialize chart events
   */
  addEvents () {
    this.telechart.on('resize', _=> {
      this.onResize();
    });

    this.eachSeries(line => {
      line.on('visibleChange', _ => {
        this.onSeriesVisibleChange( line );
      });
    });
  }

  onResize () {
    // making requests for future animation update
    this._viewportRangeUpdateNeeded = true;
    this._viewportPointsGroupingNeeded = true;

    if (this._yAxisView) {
      this._yAxisView.onChartResize();
    }

    if (this._xAxisView) {
      this._xAxisView.onChartResize();
    }

    this.redrawChartNeeded = true;
    this.redrawChart();

    this.emit( ChartEvents.REDRAW_CURSOR );
  }

  /**
   * @param {Series} line
   */
  onSeriesVisibleChange (line) {
    // find new extremes and scale
    this.updateLocalExtremes();

    this.emit( ChartEvents.SERIES_VISIBLE_CHANGE, line );
  }

  /**
   * @param {string} label
   * @return {Series}
   */
  getSeriesByLabel (label) {
    return this.findSeries(line => {
      return line.label === label;
    });
  }

  /**
   * @param {string} label
   */
  setSeriesVisible (label) {
    const series = this.getSeriesByLabel( label );
    if (series) {
      series.setVisible();
    }
  }

  /**
   * @param {string} label
   */
  setSeriesInvisible (label) {
    const series = this.getSeriesByLabel( label );
    if (series) {
      series.setInvisible();
    }
  }

  /**
   * @param {string} label
   */
  toggleSeries (label) {
    const series = this.getSeriesByLabel( label );
    if (series) {
      series.toggleVisible();

      this._setInsideChartState( false, true );
    }
  }

  toggleAllSeriesExcept (label) {
    const targetLine = this.getSeriesByLabel( label );

    if (targetLine && !targetLine.isVisible) {
      // console.log( 'target 0 -> 1, rest 1/0 -> 0' );
      this.eachSeries(line => {
        line.label === label
          ? line.setVisible()
          : line.setInvisible();
      });
    } else {
      let isSingleVisible = true;

      for (let i = 0; i < this._series.length; ++i) {
        if (this._series[ i ].isVisible
          && this._series[ i ].label !== label) {
          isSingleVisible = false;
          break;
        }
      }

      if (isSingleVisible) {
        // console.log( 'target 1 -> 0, rest 0 -> 1' );
        this.eachSeries(line => {
          line.label === label
            ? line.setInvisible()
            : line.setVisible();
        });
      } else {
        // console.log( 'target 1 -> 1, rest 1/0 -> 0' );
        this.eachSeries(line => {
          if (line.label !== label) {
            line.setInvisible();
          }
        });
      }
    }

    this.emit( ChartEvents.FORCE_BUTTONS_UPDATE );

    this._setInsideChartState( false, true );
  }

  /**
   * @param {Function} predicate
   * @return {Series}
   */
  findSeries (predicate) {
    for (let i = 0; i < this._series.length; ++i) {
      if (predicate( this._series[ i ] )) {
        return this._series[ i ];
      }
    }
  }

  /**
   * @param {Function} fn
   */
  eachSeries (fn = () => {}) {
    for (let i = 0; i < this._series.length; ++i) {
      fn( this._series[ i ], i );
    }
  }

  /**
   * @param {Object} options
   * @return {*}
   */
  extendSeriesOptions (options) {
    return options;
  }

  /**
   * @param {string} type
   */
  setChartType (type) {
    this._type = type;
  }

  /**
   * @param {number} x
   * @return {number}
   */
  projectXToCanvas (x) {
    return this.toRelativeX( x ) / this._viewportPixelX;
  }

  /**
   * @param {number} y
   * @return {number}
   */
  projectYToCanvas (y) {
    const canvasY = this.seriesOffsetTop + this.chartHeight - ( y - this._currentLocalMinY ) / this._viewportPixelY;
    return clampNumber( canvasY || 0, -1e6, 1e6 );
  }

  /**
   * @param {number} pageX
   * @param {number} pageY
   * @return {number}
   */
  projectCursorToX ({ pageX = 0, pageY = 0 }) {
    const { left } = this.telechart.canvasOffset;
    const chartLeft = pageX - left;

    return this.viewportRange[ 0 ] + chartLeft * this.viewportPixelX;
  }

  emitEvent (eventName, event) {
    switch (eventName) {
      case 'mousemove':
        this._onMouseMove( event );
        break;
      case 'mouseleave':
        this._onMouseLeave( event );
        break;

      case 'touchstart':
        this._onTouchStart( event );
        break;
      case 'touchmove':
        this._onTouchMove( event );
        break;
      case 'touchend':
        this._onTouchEnd( event );
        break;
    }
  }

  /**
   * @param {number} x
   * @return {number}
   * @private
   */
  toRelativeX (x) {
    return x - this._viewportRange[ 0 ];
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
  get chartType () {
    return this._type;
  }

  /**
   * @return {boolean}
   */
  get isChart () {
    return this._type === ChartTypes.chart;
  }

  /**
   * @return {boolean}
   */
  get isNavigatorChart () {
    return this._type === ChartTypes.navigatorChart;
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
  get viewportRange () {
    return this._viewportRange;
  }

  /**
   * @return {Array<number>}
   */
  get viewportRangeIndexes () {
    return this._viewportRangeIndexes;
  }

  /**
   * @return {number}
   */
  get viewportPixelX () {
    return this._viewportPixelX;
  }

  /**
   * @return {number}
   */
  get viewportPixelY () {
    return this._viewportPixelY;
  }

  /**
   * @return {number}
   */
  get viewportPadding () {
    return this._viewportPadding;
  }

  /**
   * @return {number}
   */
  get localExtremeDifference () {
    return this._localMaxY - this._localMinY;
  }

  /**
   * @return {number}
   */
  get globalExtremeDifference () {
    return this._globalMaxY - this._globalMinY;
  }

  /**
   * @return {number}
   */
  get currentLocalExtremeDifference () {
    return this._currentLocalMaxY - this._currentLocalMinY;
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
   * @return {number}
   */
  get currentLocalMinY () {
    return this._currentLocalMinY;
  }

  /**
   * @return {number}
   */
  get currentLocalMaxY () {
    return this._currentLocalMaxY;
  }

  /**
   * @return {number}
   */
  get chartWidth () {
    return this.telechart.canvasWidth;
  }

  /**
   * @return {number}
   */
  get chartHeight () {
    return ChartVariables.mainChartHeight;
  }

  /**
   * @return {Tween}
   */
  get minMaxYAnimation () {
    return this._minMaxYAnimation;
  }

  /**
   * @return {number}
   */
  get seriesOffsetTop () {
    return ChartVariables.mainChartOffsetTop;
  }

  /**
   * @return {number}
   */
  get seriesOffsetBottom () {
    return ChartVariables.mainChartOffsetBottom;
  }

  /**
   * @return {Array<Series>}
   */
  get series () {
    return this._series;
  }

  /**
   * @private
   */
  _updateViewportIndexes () {
    const [ rangeStart, rangeEnd ] = this._viewportRange;
    const [ minLowerIndex, minUpperIndex ] = binarySearchIndexes( this._xAxis, rangeStart );
    const [ maxLowerIndex, maxUpperIndex ] = binarySearchIndexes( this._xAxis, rangeEnd );

    this._viewportRangeIndexes = [ minUpperIndex, maxLowerIndex ];
  }

  /**
   * @param {number} minX
   * @param {number} maxX
   * @param {boolean} preservePadding
   * @private
   */
  _setViewportRange (minX, maxX, preservePadding = false) {
    const [ newMinX, newMaxX ] = this._clampViewportRange( minX, maxX, preservePadding );

    this._viewportRange = [ newMinX, newMaxX ];
    this._viewportDistance = newMaxX - newMinX;
  }

  /**
   * @param {number | Date} minX
   * @param {number | Date} maxX
   * @param {boolean} preservePadding
   * @private
   */
  _clampViewportRange (minX, maxX, preservePadding = false) {
    const xAxis = this._xAxis;

    const globalMinX = xAxis[ 0 ];
    const globalMaxX = xAxis[ xAxis.length - 1 ];

    if (isDate( minX )) {
      minX = minX.getTime();
    }
    if (isDate( maxX )) {
      maxX = maxX.getTime();
    }

    if (minX > maxX) {
      [ minX, maxX ] = [ maxX, minX ];
    }

    let newMinX = clampNumber( minX, globalMinX, globalMaxX );
    let newMaxX = clampNumber( maxX, globalMinX, globalMaxX );

    const actualPaddingX = this.computeViewportPadding( newMinX, newMaxX );

    const receivedLeftPaddingX = clampNumber( newMinX - minX, 0, actualPaddingX );
    const receivedRightPaddingX = clampNumber( maxX - newMaxX, 0, actualPaddingX );

    if (!preservePadding) {
      this._viewportLeftPaddingScale = receivedLeftPaddingX / actualPaddingX;
    }
    if (this._viewportLeftPaddingScale > 0) {
      newMinX -= actualPaddingX * this._viewportLeftPaddingScale;
    }

    if (!preservePadding) {
      this._viewportRightPaddingScale = receivedRightPaddingX / actualPaddingX;
    }
    if (this._viewportRightPaddingScale > 0) {
      newMaxX += actualPaddingX * this._viewportRightPaddingScale;
    }

    return [ newMinX, newMaxX ];
  }

  /**
   * @private
   */
  _updateOrCreateMinMaxYAnimation () {
    if (!this._minMaxYAnimation) {
      return this._createMinMaxYAnimation();
    }

    const currentLocalExtremeDifference = this.currentLocalExtremeDifference;
    const newLocalExtremeDifference = this.localExtremeDifference;
    const animationSign = currentLocalExtremeDifference < newLocalExtremeDifference;

    if (animationSign !== this._minMaxYAnimationSign) {
      return this._createMinMaxYAnimation();
    }

    this._patchMinMaxYAnimation();
  }

  /**
   * @private
   */
  _createMinMaxYAnimation () {
    if (this._minMaxYAnimation) {
      this._minMaxYAnimation.cancel();
    }

    this._updateMinMaxAnimationSign();

    this._minMaxYAnimation = new Tween(this, [
      '_currentLocalMinY',
      '_currentLocalMaxY'
    ], [
      this._localMinY,
      this._localMaxY
    ], {
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });

    const onFinished = _ => {
      this._minMaxYAnimation = null;
    };

    this._minMaxYAnimation.on( TweenEvents.COMPLETE, onFinished );
    this._minMaxYAnimation.on( TweenEvents.CANCELLED, onFinished );

    this._minMaxYAnimation.start();
  }

  /**
   * @private
   */
  _patchMinMaxYAnimation () {
    this._minMaxYAnimation.patchAnimation([
      this._localMinY,
      this._localMaxY
    ]);
  }

  /**
   * @private
   */
  _updateMinMaxAnimationSign () {
    this._minMaxYAnimationSign = this.currentLocalExtremeDifference < this.localExtremeDifference;
  }

  /**
   * @param {MouseEvent} ev
   * @private
   */
  _onMouseMove (ev) {
    this._onCursorMove( ev );
  }

  /**
   * @param {MouseEvent} ev
   * @private
   */
  _onMouseLeave (ev) {
    this._onCursorLeave();
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onTouchStart (ev) {
    const targetTouch = ev.targetTouches[ 0 ];

    this._onCursorMove( targetTouch );
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onTouchMove (ev) {
    const targetTouch = ev.targetTouches[ 0 ];

    this._onCursorMove( targetTouch );
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onTouchEnd (ev) {
    this._onCursorLeave();
  }

  /**
   * @param cursorPosition
   * @private
   */
  _onCursorMove (cursorPosition) {
    const insideChart = this._insideChart( cursorPosition );

    this._setInsideChartState(
      insideChart
    );

    if (!insideChart) {
      return;
    }

    const oldIndex = this.axisCursorPointIndex;

    const cursorX = this.projectCursorToX( cursorPosition );
    this.axisCursorPointIndex = this._findPointIndexByCursor( cursorX );
    this.axisCursorPositionX = this._xAxis[ this.axisCursorPointIndex ];

    const indexChanged = this.axisCursorPointIndex !== oldIndex;

    if (indexChanged) {
      this.emit(ChartEvents.TRANSLATE_MARKERS, [
        this.axisCursorPositionX,
        this._xAxis[ oldIndex ]
      ]);
      this.emit( ChartEvents.REDRAW_CURSOR );
    }

    this._updateLabel( indexChanged );
  }

  _updateLabel (changed = true) {
    const lines = this._prepareLabelData();
    const viewportRange = this._viewportRange;

    const data = {
      changed, lines, viewportRange
    };

    if (this.telechart.isWorker) {
      this.telechart.global.postMessage({
        type: TelechartWorkerEvents.UPDATE_DATA_LABEL,
        data
      });
    } else {
      this.telechart.dedicatedApi.updateDataLabel( data );
    }
  }

  /**
   * @param {number} cursorX
   * @return {number}
   * @private
   */
  _findPointIndexByCursor (cursorX) {
    const [ lowerIndex, upperIndex ] = binarySearchIndexes( this.xAxis, cursorX );

    let index = null;
    if (lowerIndex < 0 && upperIndex >= 0) {
      index = upperIndex;
    } else if (lowerIndex >= 0 && upperIndex >= this.xAxis.length) {
      index = lowerIndex;
    } else {
      const lowerDistance = Math.abs( cursorX - this.xAxis[ lowerIndex ] );
      const upperDistance = Math.abs( cursorX - this.xAxis[ upperIndex ] );
      const isLowerCloser = lowerDistance <= upperDistance;

      const isLowerVisible = this.xAxis[ lowerIndex ] >= this.viewportRange[ 0 ];
      const isUpperVisible = this.xAxis[ upperIndex ] <= this.viewportRange[ 1 ];

      index = isLowerCloser
        ? ( isLowerVisible ? lowerIndex : upperIndex )
        : ( isUpperVisible ? upperIndex : lowerIndex );
    }

    return index;
  }

  /**
   * @private
   */
  _onCursorLeave () {
    this._setInsideChartState( false );
  }

  /**
   * @param {boolean} isInside
   * @param {boolean} immediate
   * @private
   */
  _setInsideChartState (isInside, immediate = false) {
    const changed = this.cursorInsideChart !== isInside;
    if (!changed && !immediate) {
      return;
    }

    this.cursorInsideChart = isInside;

    if (this._markerHideTimeout) {
      clearTimeout( this._markerHideTimeout );
      this._markerHideTimeout = null;
    }

    const change = _ => {
      this._onCursorInsideChartChanged( isInside );
    };

    if (!isInside && !immediate) {
      // create short delay for cursor & markers hiding
      this._markerHideTimeout = setTimeout( change, 2000 );
    } else {
      change();
    }
  }

  /**
   * @param {boolean} isInside
   * @private
   */
  _onCursorInsideChartChanged (isInside) {
    isInside
      ? this._showCursor()
      : this._hideCursor();

    this._toggleDataLabelVisibility( isInside );
  }

  /**
   * @param visibility
   * @private
   */
  _toggleDataLabelVisibility (visibility) {
    if (this.telechart.isWorker) {
      this.telechart.global.postMessage({
        type: TelechartWorkerEvents.SET_DATA_LABEL_VISIBILITY,
        visibility
      });
    } else {
      this.telechart.dedicatedApi.setDataLabelVisibility( visibility );
    }
  }

  /**
   * @private
   */
  _showCursor () {
    this.emit( ChartEvents.SHOW_CURSOR );
  }

  /**
   * @private
   */
  _hideCursor () {
    this.emit( ChartEvents.HIDE_CURSOR );
  }

  /**
   * @param {number} pageX
   * @param {number} pageY
   * @return {boolean}
   * @private
   */
  _insideChart ({ pageX, pageY }) {
    // todo: workaround from previous Telechart version
    return true;
  }

  /**
   * @return {Array}
   * @private
   */
  _prepareLabelData () {
    const data = [];

    const index = this.axisCursorPointIndex;
    const x = this._xAxis[ index ];

    this.eachSeries(line => {
      data.push({
        color: line.color,
        label: line.label,
        name: line.name,
        visible: line.isVisible,
        x,
        y: line._yAxis[ index ],
        canvasY: this.projectYToCanvas( line._yAxis[ index ] ),
        canvasX: this.projectXToCanvas( line._xAxis[ index ] )
      });
    });

    return data;
  }
}
