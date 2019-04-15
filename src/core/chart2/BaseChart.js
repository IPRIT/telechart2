import { EventEmitter } from '../misc/EventEmitter';
import { SeriesTypeMapping, SeriesTypes } from '../series/SeriesTypes';
import { Series } from '../series/Series';
import { Tween, TweenEvents } from '../animation/Tween';
import { ChartTypes } from './ChartTypes';
import { ChartEvents } from './events/ChartEvents';
import { ChartAxisY } from './axis/ChartAxisY';
import { ChartAxisY2 } from './axis/ChartAxisY2';
import { ChartAxisX } from './axis/ChartAxisX';

import {
  arrayMax,
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
   */
  xAxis = [];

  /**
   * @type {Array<Series>}
   */
  series = [];

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
  viewportPointsStep = 1;

  /**
   * @type {number}
   * @private
   */
  _viewportDistance = 0;

  /**
   * @type {number}
   */
  viewportPixelX = 0;

  /**
   * @type {number}
   */
  viewportPixelY = 0;

  /**
   * @type {number}
   */
  viewportPixelY2 = 0;

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
   */
  localMinY = 0;

  /**
   * @type {number}
   */
  localMaxY = 0;

  /**
   * @type {number}
   */
  localMinY2 = 0;

  /**
   * @type {number}
   */
  localMaxY2 = 0;

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
   */
  currentLocalMinY = null;

  /**
   * @type {number}
   */
  currentLocalMaxY = null;

  /**
   * @type {number}
   */
  currentLocalMinY2 = null;

  /**
   * @type {number}
   */
  currentLocalMaxY2 = null;

  /**
   * @type {Tween}
   */
  minMaxYAnimation = null;

  /**
   * @type {number}
   */
  minMaxYAnimationSign = null;

  /**
   * @type {Tween}
   */
  minMaxYAnimation2 = null;

  /**
   * @type {number}
   */
  minMaxYAnimationSign2 = null;

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
  yAxisView = null;

  /**
   * @type {ChartAxisY2}
   * @private
   */
  yAxisView2 = null;

  /**
   * @type {ChartAxisX}
   * @private
   */
  xAxisView = null;

  /**
   * @type {boolean}
   */
  redrawChartNeeded = true;

  /**
   * @type {boolean}
   */
  isLineChart = false;

  /**
   * @type {boolean}
   */
  isYScaled = false;

  /**
   * @type {boolean}
   */
  isPercentage = false;

  /**
   * @type {boolean}
   */
  isStacked = false;

  /**
   * @type {Array<number>}
   */
  stackedSumTree = [];

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

    if (this.isMainChart && this.isStacked) {
      this.initializeStackedSumTree();
    }

    this.addEvents();

    this.setInitialRange();
    this.approximateViewportPoints();

    if (this.isMainChart) {
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

    const minMaxYAnimation = this.minMaxYAnimation;
    let extremesUpdated = false;

    if (minMaxYAnimation && minMaxYAnimation.isRunning) {
      this.minMaxYAnimation.update( deltaTime );

      extremesUpdated = true;
      redrawChart = true;
      redrawAxis = true;
    }

    // 2 y axes
    const minMaxYAnimation2 = this.minMaxYAnimation2;

    if (minMaxYAnimation2 && minMaxYAnimation2.isRunning) {
      this.minMaxYAnimation2.update( deltaTime );

      extremesUpdated = true;
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

        if (this.isYScaled) {
          redrawAxis = true;
        }
      }

      line.update( deltaTime );
    });

    if (this.yAxisView) {
      if (redrawAxis) {
        this.yAxisView.requestRedraw();
      }

      this.yAxisView.update( deltaTime );
    }

    if (this.yAxisView2) {
      if (redrawAxis) {
        this.yAxisView2.requestRedraw();
      }

      this.yAxisView2.update( deltaTime );
    }

    if (this.xAxisView) {
      if (redrawAxis) {
        this.xAxisView.requestRedraw();
      }

      this.xAxisView.update( deltaTime );
    }

    this.redrawChartNeeded = this.redrawChartNeeded || redrawChart;
  }

  render () {
    if (this.redrawChartNeeded || this.telechart.forceRedraw) {
      this.redrawChart();

      this.redrawChartNeeded = false;
    }

    let renderYAxis = this.telechart.forceRedraw;

    if (this.yAxisView) {
      if (this.yAxisView.redrawNeeded) {
        renderYAxis = true;
      }
    }

    if (this.yAxisView2) {
      if (this.yAxisView2.redrawNeeded) {
        renderYAxis = true;
      }
    }

    if (renderYAxis) {
      if (this.yAxisView) {
        // clear rect inside
        this.yAxisView.requestRedraw();
        this.yAxisView.render();
      }

      if (this.yAxisView2) {
        this.yAxisView2.requestRedraw();
        this.yAxisView2.render();
      }
    }

    if (this.xAxisView) {
      this.xAxisView.render();
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

    if (!this.isStacked && !this.isPercentage) {
      this.isLineChart = true;
    }

    const xAxisIndex = columns.findIndex(column => {
      return types[ column[ 0 ] ] === SeriesTypes.x;
    });
    const xAxis = this.xAxis = columns[ xAxisIndex ].slice( 1 );

    let yAxes = columns.slice(); // copy an array to change later
    yAxes.splice( xAxisIndex, 1 ); // remove x axis from the array

    for (let i = 0; i < yAxes.length; ++i) {
      const yAxis = yAxes[ i ].slice();
      const label = yAxis.shift();
      const type = types[ label ];
      const color = colors[ label ];
      const name = names[ label ];

      if (type === 'bar') {
        this.isLineChart = false;
      }

      // prepare series settings
      const settings = {
        xAxis, yAxis, label, type,
        color, name, options: this.extendSeriesOptions( options )
      };

      const SeriesClass = SeriesTypeMapping[ type ] || Series;

      // create instance
      const series = new SeriesClass( this, settings, i );
      series.initialize();

      this.series.push( series );
    }
  }

  initializeStackedSumTree () {
    const maxN = 2 ** this.series.length;
    const lines = this.series;
    const xAxis = this.xAxis;
    const chunkSize = xAxis.length;
    const yAxes = lines.map( line => line.yAxis );
    const sumTree = Array( xAxis.length );
    let k = 0;

    for (let currentN = 0; currentN < maxN; ++currentN) {
      for (let columnIndex = 0; columnIndex < chunkSize; ++columnIndex) {
        let sum = 0;

        if (currentN) {
          for (let bit = 1, len = lines.length; bit <= len; ++bit) {
            if (currentN & bit) {
              sum += yAxes[ bit - 1 ][ columnIndex ];
            }
          }
        }

        sumTree[ currentN * chunkSize + columnIndex ] = sum;
      }
    }

    this.stackedSumTree = sumTree;
  }

  /**
   * Creates y axis
   */
  initializeAxisY () {
    const yAxisView = new ChartAxisY( this, this.isYScaled );
    yAxisView.initialize();

    this.yAxisView = yAxisView;

    if (this.isYScaled) {
      const yAxisView2 = new ChartAxisY2( this, this.isYScaled );
      yAxisView2.initialize();

      this.yAxisView2 = yAxisView2;
    }
  }

  /**
   * Creates y axis
   */
  initializeAxisX () {
    const xAxisView = new ChartAxisX( this );
    xAxisView.initialize();

    this.xAxisView = xAxisView;
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
    const oldDistance = this._viewportDistance;

    // recompute X boundaries
    this._setViewportRange( minX, maxX, preservePadding );

    // detect if viewport distance is changed
    const distanceChanged = Math.abs( oldDistance - this._viewportDistance ) > 1e-2;

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

      localExtremesUpdateRequested = true;
    }

    const updateExtremes = !skipExtremes && localExtremesUpdateRequested;

    this.eachSeries(line => {
      // update local extremes only if indexes range changed
      // todo: remove update for percentage
      if (updateExtremes && !this.isStacked || this.isPercentage) {
        // update minY and maxY local values for each line
        line.updateLocalExtremes();
      }

      // recompute and repaint path in next animation update
      line.requestPathUpdate();
    });

    if (updateExtremes) {
      // update local extremes on chart level
      this.updateLocalExtremes();

      if (this.isYScaled) {
        this.updateLocalExtremes2();
      }
    }

    // recompute pixel values
    this.updateViewportPixel();

    if (this.xAxisView) {
      // update x axis animations only if distance has changed
      this.xAxisView.requestUpdateAnimations( !distanceChanged );
      this.xAxisView.requestRedraw();
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
    endIndex = Math.min( this.xAxis.length - 1, endIndex + 1 );

    // if we have no enough points
    // then we don't need to approximate
    if (endIndex - startIndex < 100 && !this.isNavigatorChart) {
      // just save indexes of points for increase performance
      // [ startIndex, endIndex ]
      this._viewportPointsIndexes[ 0 ] = startIndex;
      this._viewportPointsIndexes[ 1 ] = endIndex;
      this.viewportPointsStep = 1;

      // all work done here
      return;
    }

    const boostLimit = 300;
    const boostScale = 1 + this.xAxis.length > boostLimit
      ? Math.max(0, ( endIndex - startIndex ) / this.xAxis.length )
      : 1;

    let groupingDistanceLimitX = boostScale * this._groupingPixels * this.viewportPixelX;

    let groupStartIndex = startIndex;

    let step = 1;

    for (let i = startIndex + 1; i <= endIndex; ++i) {
      const pointX = this.xAxis[ i ];

      const groupStartDifferenceX = pointX - this.xAxis[ groupStartIndex ];

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

    endIndex = Math.min( endIndex, this.xAxis.length - 1 );

    this._viewportPointsIndexes[ 0 ] = startIndex;
    this._viewportPointsIndexes[ 1 ] = endIndex;
    this.viewportPointsStep = step;
  }

  /**
   * Find new local min and max extremes among visible series
   */
  updateLocalExtremes () {
    const isLineChart = this.isLineChart;
    const isYScaled = this.isYScaled;
    const isStacked = this.isStacked;
    const isPercentage = this.isPercentage;

    let localMinY = isLineChart ? Infinity : 0;
    let localMaxY = 0;

    if (isYScaled) {
      const line = this.series[ 0 ];
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
    } else if (isStacked && !isPercentage) {
      const chunkOffset = this.computeSumTreeChunkOffset();

      const [ minIndex, maxIndex ] = this._viewportRangeIndexes;
      localMaxY = arrayMax( this.stackedSumTree, chunkOffset + minIndex, chunkOffset + maxIndex );

      console.log( localMaxY, this.computeSumTreeN() );
    } else {
      this.eachSeries(line => {
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
    }

    let oldLocalMinY = this.localMinY;
    let oldLocalMaxY = this.localMaxY;

    this.localMinY = localMinY;
    this.localMaxY = localMaxY;

    let updateAnimation = false;

    if (typeof this.currentLocalMinY !== 'number') {
      // set initial local min y
      this.currentLocalMinY = this.localMinY;
    } else if (this.localMinY !== oldLocalMinY) {
      updateAnimation = true;
    }

    if (typeof this.currentLocalMaxY !== 'number') {
      // set initial local max y
      this.currentLocalMaxY = this.localMaxY;
    } else if (this.localMaxY !== oldLocalMaxY) {
      updateAnimation = true;
    }

    if (updateAnimation) {
      this._updateOrCreateMinMaxYAnimation();

      if (this.yAxisView) {
        this.yAxisView.requestUpdateAnimations();
      }

      if (this.yAxisView2) {
        this.yAxisView2.requestUpdateAnimations();
      }
    }
  }

  updateLocalExtremes2 () {
    const isLineChart = this.isLineChart;

    let localMinY2 = isLineChart ? Infinity : 0;
    let localMaxY2 = 0;

    const line = this.series[ 1 ];
    if (!line || !line.isVisible) {
      // find among visible series
      return;
    }

    if (localMinY2 > line.localMinY) {
      localMinY2 = line.localMinY;
    }
    if (localMaxY2 < line.localMaxY) {
      localMaxY2 = line.localMaxY;
    }

    let oldLocalMinY2 = this.localMinY2;
    let oldLocalMaxY2 = this.localMaxY2;

    this.localMinY2 = localMinY2;
    this.localMaxY2 = localMaxY2;

    let updateAnimation = false;

    if (typeof this.currentLocalMinY2 !== 'number') {
      // set initial local min y
      this.currentLocalMinY2 = this.localMinY2;
    } else if (this.localMinY2 !== oldLocalMinY2) {
      updateAnimation = true;
    }

    if (typeof this.currentLocalMaxY2 !== 'number') {
      // set initial local max y
      this.currentLocalMaxY2 = this.localMaxY2;
    } else if (this.localMaxY2 !== oldLocalMaxY2) {
      updateAnimation = true;
    }

    if (updateAnimation) {
      this._updateOrCreateMinMaxYAnimation2();

      if (this.yAxisView) {
        this.yAxisView.requestUpdateAnimations();
      }

      if (this.yAxisView2) {
        this.yAxisView2.requestUpdateAnimations();
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
  computeViewportPixelY (minY = this.currentLocalMinY, maxY = this.currentLocalMaxY) {
    return ( maxY - minY ) / this.chartHeight;
  }

  /**
   * @param minY
   * @param maxY
   * @return {number}
   */
  computeViewportPixelY2 (minY = this.currentLocalMinY2, maxY = this.currentLocalMaxY2) {
    return ( maxY - minY ) / this.chartHeight;
  }

  /**
   * Updates pixel value for each axis
   */
  updateViewportPixel () {
    this.viewportPixelX = this._viewportDistance / this.chartWidth;
    this.viewportPixelY = this.computeViewportPixelY();

    if (this.isYScaled) {
      this.viewportPixelY2 = this.computeViewportPixelY2();
    }
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

    if (this.yAxisView) {
      this.yAxisView.onChartResize();
    }

    if (this.yAxisView2) {
      this.yAxisView2.onChartResize();
    }

    if (this.xAxisView) {
      this.xAxisView.onChartResize();
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

    if (this.isYScaled) {
      this.updateLocalExtremes2();
    }

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

      for (let i = 0; i < this.series.length; ++i) {
        if (this.series[ i ].isVisible
          && this.series[ i ].label !== label) {
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
    for (let i = 0; i < this.series.length; ++i) {
      if (predicate( this.series[ i ] )) {
        return this.series[ i ];
      }
    }
  }

  /**
   * @param {Function} fn
   */
  eachSeries (fn = () => {}) {
    for (let i = 0; i < this.series.length; ++i) {
      fn( this.series[ i ], i );
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
    return this.toRelativeX( x ) / this.viewportPixelX;
  }

  /**
   * @param {number} y
   * @return {number}
   */
  projectYToCanvas (y) {
    const canvasY = this.seriesOffsetTop + this.chartHeight - ( y - this.currentLocalMinY ) / this.viewportPixelY;
    return clampNumber( canvasY || 0, -1e6, 1e6 );
  }

  /**
   * @param {number} y
   * @return {number}
   */
  projectYToCanvas2 (y) {
    const canvasY = this.seriesOffsetTop + this.chartHeight - ( y - this.currentLocalMinY2 ) / this.viewportPixelY2;
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

  /**
   * @return {number}
   */
  computeSumTreeN () {
    let bits = 0;
    for (let i = 0; i < this.series.length; ++i) {
      if (this.series[i].isVisible) {
        bits |= 1 << i;
      }
    }
    return bits;
  }

  /**
   * @return {number}
   */
  computeSumTreeChunkOffset () {
    return this.xAxis.length * this.computeSumTreeN();
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
  get isMainChart () {
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
  get viewportPadding () {
    return this._viewportPadding;
  }

  /**
   * @return {number}
   */
  get localExtremeDifference () {
    return this.localMaxY - this.localMinY;
  }

  /**
   * @return {number}
   */
  get localExtremeDifference2 () {
    return this.localMaxY2 - this.localMinY2;
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
    return this.currentLocalMaxY - this.currentLocalMinY;
  }

  /**
   * @return {number}
   */
  get currentLocalExtremeDifference2 () {
    return this.currentLocalMaxY2 - this.currentLocalMinY2;
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
   * @private
   */
  _updateViewportIndexes () {
    const [ rangeStart, rangeEnd ] = this._viewportRange;
    const [ minLowerIndex, minUpperIndex ] = binarySearchIndexes( this.xAxis, rangeStart );
    const [ maxLowerIndex, maxUpperIndex ] = binarySearchIndexes( this.xAxis, rangeEnd );

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
    const xAxis = this.xAxis;

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
    if (!this.minMaxYAnimation) {
      return this._createMinMaxYAnimation();
    }

    const currentLocalExtremeDifference = this.currentLocalExtremeDifference;
    const newLocalExtremeDifference = this.localExtremeDifference;
    const animationSign = currentLocalExtremeDifference < newLocalExtremeDifference;

    if (animationSign !== this.minMaxYAnimationSign) {
      return this._createMinMaxYAnimation();
    }

    this._patchMinMaxYAnimation();
  }

  /**
   * @private
   */
  _updateOrCreateMinMaxYAnimation2 () {
    if (!this.minMaxYAnimation2) {
      return this._createMinMaxYAnimation2();
    }

    const currentLocalExtremeDifference = this.currentLocalExtremeDifference2;
    const newLocalExtremeDifference = this.localExtremeDifference2;
    const animationSign = currentLocalExtremeDifference < newLocalExtremeDifference;

    if (animationSign !== this.minMaxYAnimationSign2) {
      return this._createMinMaxYAnimation2();
    }

    this._patchMinMaxYAnimation2();
  }

  /**
   * @private
   */
  _createMinMaxYAnimation () {
    if (this.minMaxYAnimation) {
      this.minMaxYAnimation.cancel();
    }

    this._updateMinMaxAnimationSign();

    this.minMaxYAnimation = new Tween(this, [
      'currentLocalMinY',
      'currentLocalMaxY'
    ], [
      this.localMinY,
      this.localMaxY
    ], {
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });

    const onFinished = _ => {
      this.minMaxYAnimation = null;
    };

    this.minMaxYAnimation.on( TweenEvents.COMPLETE, onFinished );
    this.minMaxYAnimation.on( TweenEvents.CANCELLED, onFinished );

    this.minMaxYAnimation.start();
  }

  /**
   * @private
   */
  _createMinMaxYAnimation2 () {
    if (this.minMaxYAnimation2) {
      this.minMaxYAnimation2.cancel();
    }

    this._updateMinMaxAnimationSign2();

    this.minMaxYAnimation2 = new Tween(this, [
      'currentLocalMinY2',
      'currentLocalMaxY2'
    ], [
      this.localMinY2,
      this.localMaxY2
    ], {
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });

    const onFinished = _ => {
      this.minMaxYAnimation2 = null;
    };

    this.minMaxYAnimation2.on( TweenEvents.COMPLETE, onFinished );
    this.minMaxYAnimation2.on( TweenEvents.CANCELLED, onFinished );

    this.minMaxYAnimation2.start();
  }

  /**
   * @private
   */
  _patchMinMaxYAnimation () {
    this.minMaxYAnimation.patchAnimation([
      this.localMinY,
      this.localMaxY
    ]);
  }

  /**
   * @private
   */
  _patchMinMaxYAnimation2 () {
    this.minMaxYAnimation2.patchAnimation([
      this.localMinY2,
      this.localMaxY2
    ]);
  }

  /**
   * @private
   */
  _updateMinMaxAnimationSign () {
    this.minMaxYAnimationSign = this.currentLocalExtremeDifference < this.localExtremeDifference;
  }

  /**
   * @private
   */
  _updateMinMaxAnimationSign2 () {
    this.minMaxYAnimationSign2 = this.currentLocalExtremeDifference2 < this.localExtremeDifference2;
  }
}
