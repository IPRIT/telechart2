import { EventEmitter } from '../misc/EventEmitter';
import { arrayMinMax, clampNumber } from '../../utils';
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
   * @type {boolean}
   * @private
   */
  _markerVisible = false;

  /**
   * @type {Tween}
   * @private
   */
  _markerAnimation = null;

  /**
   * @type {number}
   * @private
   */
  _markerRadius = 0;

  /**
   * @type {number}
   * @private
   */
  _maxMarkerRadius = 4;

  /**
   * @type {number}
   * @private
   */
  _markerPointIndex = 0;

  /**
   * @type {boolean}
   * @private
   */
  _markerPositionUpdateNeeded = false;

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
  _opacity = 1;

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
    this._createPoints();
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

    // only base charts has markers
    if (this.isLineChart) {
      if (this._markerPositionUpdateNeeded || pathUpdated) {
        this._updateMarkerPosition();

        this._markerPositionUpdateNeeded = false;
      }

      const markerAnimation = this._markerAnimation;
      const hasMarkerAnimation = markerAnimation && markerAnimation.isRunning;
      if (hasMarkerAnimation) {
        markerAnimation.update( deltaTime );

        // this.updateMarkerRadius();
      }
    }
  }

  render (context = this.chart.telechart.mainContext) {
    this.draw( context );
  }

  draw (context) {
    this.drawPath( context );
  }

  drawPath (context) {
    this.chart._useViewportPointsInterval
      ? this.drawPathByInterval( context, this.chart._viewportPointsIndexes )
      : this.drawPathByArray( context, this.chart._viewportPointsIndexes );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   */
  drawPathByInterval (context, interval) {
    if (!interval.length
      || interval[ 1 ] - interval[ 0 ] <= 0) {
      return;
    }

    const [ startIndex, endIndex ] = interval;
    const [ minViewportX ] = this.chart.viewportRange;

    const viewportPixelX = this.chart.viewportPixelX;
    const viewportPixelY = this.chart.viewportPixelY;

    const chartHeight = this.chart.chartHeight;
    const chartOffsetTop = this.chart.seriesOffsetTop;
    const currentLocalMinY = this.chart.currentLocalMinY;
    const chartBottomLineY = chartOffsetTop + chartHeight;

    const dxOffset = minViewportX / viewportPixelX;
    const dyOffset = currentLocalMinY / viewportPixelY;

    let x = this._xAxis[ startIndex ];
    let y = this._yAxis[ startIndex ];

    context.globalAlpha = this._opacity;
    context.strokeStyle = this._color;
    context.lineWidth = this.strokeWidth;
    context.beginPath();
    /*context.lineJoin = 'round';
    context.lineCap = 'round';*/
    context.lineJoin = 'bevel';
    context.lineCap = 'butt';

    context.moveTo(
      x / viewportPixelX - dxOffset,
      chartBottomLineY - ( y / viewportPixelY - dyOffset )
    );

    for (let i = startIndex + 1; i <= endIndex; ++i) {
      x = this._xAxis[ i ];
      y = this._yAxis[ i ];

      context.lineTo(
        x / viewportPixelX - dxOffset,
        chartBottomLineY - ( y / viewportPixelY - dyOffset )
      );
    }

    context.stroke();
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} array
   */
  drawPathByArray (context, array) {
    if (array.length <= 1) {
      return;
    }

    const startIndex = array[ 0 ];
    const [ minViewportX ] = this.chart.viewportRange;

    const viewportPixelX = this.chart.viewportPixelX;
    const viewportPixelY = this.chart.viewportPixelY;

    const chartHeight = this.chart.chartHeight;
    const chartOffsetTop = this.chart.seriesOffsetTop;
    const currentLocalMinY = this.chart.currentLocalMinY;
    const chartBottomLineY = chartOffsetTop + chartHeight;

    const dxOffset = minViewportX / viewportPixelX;
    const dyOffset = currentLocalMinY / viewportPixelY;

    let x = this._xAxis[ startIndex ];
    let y = this._yAxis[ startIndex ];

    context.globalAlpha = this._opacity;
    context.strokeStyle = this._color;
    context.lineWidth = this.strokeWidth;
    context.beginPath();
    /*context.lineJoin = 'round';
    context.lineCap = 'round';*/
    context.lineJoin = 'bevel';
    context.lineCap = 'butt';

    context.moveTo(
      x / viewportPixelX - dxOffset,
      chartBottomLineY - ( y / viewportPixelY - dyOffset )
    );

    for (let i = 1; i < array.length; ++i) {
      x = this._xAxis[ array[ i ] ];
      y = this._yAxis[ array[ i ] ];

      context.lineTo(
        x / viewportPixelX - dxOffset,
        chartBottomLineY - ( y / viewportPixelY - dyOffset )
      );
    }

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

  showMarker () {
    this._createMarkerShowAnimation();
    this._markerVisible = true;
  }

  hideMarker () {
    this._createMarkerHideAnimation();
    this._markerVisible = false;
  }

  toggleMarker () {
    this._markerVisible
      ? this.hideMarker()
      : this.showMarker();
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
   * Updates viewport points
   */
  updateViewportPoints () {
    this.chart._useViewportPointsInterval
      ? this.updateViewportPointsByInterval()
      : this.updateViewportPointsByArray();
  }

  /**
   * Updates points by array of points
   */
  updateViewportPointsByArray () {
    const indexes = this.chart._viewportPointsIndexes;

    for (let i = 0; i < indexes.length; ++i) {
      const pointIndex = indexes[ i ];
      const point = this._points[ pointIndex ];
      point.setCanvasXY(
        this.chart.projectXToCanvas( point.x ),
        this.chart.projectYToCanvas( point.y ),
      );
    }
  }

  /**
   * Updates points by interval
   */
  updateViewportPointsByInterval () {
    const [ startIndex, endIndex ] = this.chart._viewportPointsIndexes;
    for (let i = startIndex; i <= endIndex; ++i) {
      const point = this._points[ i ];
      point.setCanvasXY(
        this.chart.projectXToCanvas( point.x ),
        this.chart.projectYToCanvas( point.y ),
      );
    }
  }

  /**
   * Mark to update path in next animation frame
   */
  requestPathUpdate () {
    this._pathUpdateNeeded = true;
  }

  /**
   * Mark to update marker in next animation frame
   */
  setMarkerPointIndex (index) {
    this._markerPointIndex = index;
    this._markerPositionUpdateNeeded = true;
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
  _updateMarkerPosition () {
    /*const x = this._xAxis[ this._markerPointIndex ];
    const y = this._yAxis[ this._markerPointIndex ];

    const svgX = this.chart.projectXToCanvas( x );
    const svgY = this.chart.projectYToCanvas( y );

    setAttributesNS(this._marker, {
      cx: svgX,
      cy: svgY
    });*/
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
    this._opacityAnimation = new Tween(this, '_opacity', opacity, {
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
   * @private
   */
  _createMarkerShowAnimation () {
    if (this._markerAnimation && this._markerVisible) {
      // already have animation
      return;
    }

    this._createMarkerAnimation( this._maxMarkerRadius );
  }

  /**
   * @private
   */
  _createMarkerHideAnimation () {
    if (this._markerAnimation && !this._markerVisible) {
      // already have animation
      return;
    }

    this._createMarkerAnimation( 0 );
  }

  /**
   * @param {number} radius
   * @private
   */
  _createMarkerAnimation (radius) {
    this._markerAnimation = new Tween(this, '_markerRadius', radius, {
      duration: this._markerVisible ? 300 : 150,
      timingFunction: 'easeInOutCubic'
    });

    const onFinished = _ => {
      this._markerAnimation = null;
    };

    this._markerAnimation.on( TweenEvents.COMPLETE, onFinished );
    this._markerAnimation.on( TweenEvents.CANCELLED, onFinished );

    this._markerAnimation.start();
  }
}
