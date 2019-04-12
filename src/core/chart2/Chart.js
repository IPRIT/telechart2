import { BaseChart } from './BaseChart';
import { binarySearchIndexes, ChartVariables } from '../../utils';
import { ChartTypes } from './ChartTypes';
import { ChartEvents } from './events/ChartEvents';
import { Tween, TweenEvents } from '../animation/Tween';
import { TransitionEvents, TransitionPlayback } from '../animation/TransitionPlayback';

const CursorAnimationType = {
  inactive: 0x0,
  showing: 0x1,
  hiding: 0x2,
};

export class Chart extends BaseChart {

  /**
   * @type {string}
   * @private
   */
  _type = ChartTypes.chart;

  /**
   * @type {boolean}
   * @private
   */
  _firstCursorAnimation = true;

  /**
   * @type {boolean}
   */
  redrawCursorRequested = false;

  /**
   * @type {TransitionPlayback}
   */
  cursorAnimation = null;

  /**
   * @type {Tween}
   */
  cursorOpacityAnimation = null;

  /**
   * @type {number}
   */
  cursorOpacity = 0;

  /**
   * @type {string}
   */
  cursorAnimationType = CursorAnimationType.inactive;

  initialize () {
    super.initialize();

    this.addCursorEvents();
  }

  update (deltaTime) {
    super.update(deltaTime);

    let redrawCursors = false;

    if (this.hasCursorOpacityAnimation) {
      this.cursorOpacityAnimation.update( deltaTime );
      redrawCursors = true;
    }

    if (this.hasCursorAnimation) {
      this.cursorAnimation.update( deltaTime );
      redrawCursors = true;
    }

    if (this.minMaxYAnimation && this.minMaxYAnimation.isRunning) {
      redrawCursors = true;
    }

    if (redrawCursors) {
      this.requestRedrawCursor();
    }
  }

  render () {
    super.render();

    this.redrawUIOverlay();
  }

  redrawChart () {
    const context = this.telechart.mainContext;

    context.clearRect( 0, 0, this.chartWidth, ChartVariables.mainMaxHeight );

    this.eachSeries(line => {
      line.render();
    });
  }

  redrawUIOverlay () {
    if (this.redrawCursorRequested || this.telechart.forceRedraw) {
      this.redrawCursor();
      this.redrawMarkers();

      this.redrawCursorRequested = false;
    }
  }

  requestRedrawCursor () {
    this.redrawCursorRequested = true;
  }

  redrawCursor () {
    const context = this.telechart.uiContext;
    const colors = this.telechart.themeColors;

    context.clearRect( 0, 0, this.chartWidth, ChartVariables.mainMaxHeight );

    const cursorColor = colors.axisColor;
    const cursorColorAlpha = colors.axisColorAlpha;

    context.globalAlpha = cursorColorAlpha * this.cursorOpacity;
    context.strokeStyle = cursorColor;
    context.lineWidth = 1;

    const x = this.projectXToCanvas( this.axisCursorPositionX );
    const y1 = this.seriesOffsetTop;
    const y2 = this.seriesOffsetTop + this.chartHeight;

    context.beginPath();
    context.moveTo( x, y1 );
    context.lineTo( x, y2 );
    context.stroke();
  }

  redrawMarkers () {
    const context = this.telechart.uiContext;
    const colors = this.telechart.themeColors;
    const lines = this.series;
    const markerRadius = 3;

    const fillColor = colors.color;

    const currentX = this.cursorAnimation && this.cursorAnimation.currentPosition || this.axisCursorPositionX;

    let [ lowerIndex, upperIndex ] = binarySearchIndexes( this.xAxis, currentX );
    if (lowerIndex < 0) {
      lowerIndex = 0;
    }
    if (upperIndex >= this.xAxis.length) {
      upperIndex = this.xAxis.length - 1;
    }

    const lowerX = this.xAxis[ lowerIndex ];
    const upperX = this.xAxis[ upperIndex ];

    let linearScale = 0;
    if (upperX - lowerX > 0) {
      linearScale = ( currentX - lowerX ) / ( upperX - lowerX );
    }

    const canvasX = this.projectXToCanvas( currentX );

    context.fillStyle = fillColor;
    context.lineWidth = 4;

    for (let i = 0; i < lines.length; ++i) {
      const line = lines[ i ];
      context.strokeStyle = line.color;
      context.globalAlpha = line.opacity;

      const y0 = line.yAxis[ lowerIndex ];
      const y1 = line.yAxis[ upperIndex ];
      const y = y0 + ( y1 - y0 ) * linearScale;

      const canvasY = this.projectYToCanvas( y );

      context.beginPath();
      context.arc(canvasX, canvasY, markerRadius * line.opacity * this.cursorOpacity, 0, 2 * Math.PI);
      context.stroke();
      context.fill();
    }
  }

  /**
   * @param {number} min
   * @param {number} max
   */
  setNavigationRange (min, max) {
    const [ minX, maxX ] = this._resolveNavigationRange( min, max );

    this.setViewportRange( minX, maxX );
  }

  /**
   * @param {number} min
   * @param {number} max
   */
  animateNavigationRangeTo (min, max) {
    const [ minX, maxX ] = this._resolveNavigationRange( min, max );

    this.animateViewportRangeTo( minX, maxX );
  }

  /**
   * Sets initial viewport range for the chart
   */
  setInitialRange () {
    const globalMinX = this.xAxis[ 0 ];
    const globalMaxX = this.xAxis[ this.xAxis.length - 1 ];
    const initialViewport = Math.floor( ( globalMaxX - globalMinX ) * ChartVariables.initialViewportScale );
    const viewportPadding = this.computeViewportPadding(
      globalMaxX - initialViewport,
      globalMaxX
    );

    // set initial range
    this.setViewportRange(
      globalMaxX - initialViewport - viewportPadding,
      globalMaxX + viewportPadding
    );
  }

  /**
   * @param {*} options
   * @return {*}
   */
  extendSeriesOptions (options) {
    return Object.assign({}, options, {
      strokeWidth: 2
    });
  }

  addCursorEvents () {
    this.on(ChartEvents.REDRAW_CURSOR, _ => {
      this.requestRedrawCursor();
    });

    this.on(ChartEvents.SHOW_CURSOR, _ => {
      this.showCursor();
    });

    this.on(ChartEvents.HIDE_CURSOR, _ => {
      this.hideCursor();
    });

    this.on(ChartEvents.TRANSLATE_MARKERS, ([ newX, oldX ]) => {
      this.translateMarkers( newX, oldX );
    });
  }

  showCursor () {
    if (this.cursorOpacity >= 1
      || this.cursorAnimationType === CursorAnimationType.showing) {
      return;
    }

    this.cancelCursorOpacityAnimation();
    this.createCursorOpacityAnimation( 1 );
  }

  hideCursor () {
    if (this.cursorOpacity <= 0
      || this.cursorAnimationType === CursorAnimationType.hiding) {
      return;
    }

    this.cancelCursorOpacityAnimation();
    this.createCursorOpacityAnimation( 0 );
  }

  translateMarkers (newX, oldX) {
    oldX = this.cursorAnimation && this.cursorAnimation.currentPosition || oldX;

    if (!this.cursorAnimation) {
      if (this._firstCursorAnimation) {
        oldX = newX;
      }
      this._firstCursorAnimation = false;
      this.createCursorAnimation( newX, oldX );
    } else {
      this.patchCursorAnimation( newX, oldX );
    }
  }

  createCursorOpacityAnimation (toOpacity = 0) {
    const animation = new Tween(this, 'cursorOpacity', toOpacity, {
      duration: toOpacity === 1 ? 150 : 300, // fast appear | slow disappear
      timingFunction: 'easeInOutQuad'
    });

    const onFinished = _ => {
      this.cursorOpacityAnimation = null;
      this.cursorAnimationType = CursorAnimationType.inactive;
    };

    animation.on( TweenEvents.COMPLETE, onFinished );
    animation.on( TweenEvents.CANCELLED, onFinished );

    animation.start();

    this.cursorOpacityAnimation = animation;
  }

  cancelCursorOpacityAnimation () {
    if (this.hasCursorOpacityAnimation) {
      this.cursorOpacityAnimation.cancel();
      this.cursorOpacityAnimation = null;
    }
  }

  createCursorAnimation (toX, fromX) {
    const onFinished = _ => {
      this.cursorAnimation = null;
    };

    const viewportDistance = this.viewportRange[ 1 ] - this.viewportRange[ 0 ];

    const velocity = viewportDistance * .000001;
    const acceleration = viewportDistance * .0000001;
    const maxVelocity = 1e9;

    const animation = new TransitionPlayback(fromX, toX, {
      velocity,
      acceleration,
      maxVelocity
    });

    animation.on( TransitionEvents.FINISHED, onFinished );
    animation.start();

    this.cursorAnimation = animation;
  }

  patchCursorAnimation (toX, fromX) {
    if (!this.cursorAnimation) {
      return;
    }

    const viewportDistance = this.viewportRange[ 1 ] - this.viewportRange[ 0 ];
    const scale = Math.abs( toX - fromX ) / viewportDistance;

    const acceleration = viewportDistance * scale;

    // this.cursorAnimation.setAcceleration( acceleration );
    this.cursorAnimation.setToPosition( toX );
  }

  /**
   * @return {number}
   */
  get chartHeight () {
    return ChartVariables.mainChartHeight;
  }

  /**
   * @return {boolean}
   */
  get hasCursorOpacityAnimation () {
    return this.cursorOpacityAnimation && this.cursorOpacityAnimation.isRunning;
  }

  /**
   * @return {boolean}
   */
  get hasCursorAnimation () {
    return this.cursorAnimation && this.cursorAnimation.isRunning;
  }

  /**
   * @param {number} min
   * @param {number} max
   * @private
   */
  _resolveNavigationRange (min, max) {
    const globalMinX = this.xAxis[ 0 ];
    const globalMaxX = this.xAxis[ this.xAxis.length - 1 ];

    const globalDistance = globalMaxX - globalMinX;

    let minX = globalMinX + min * globalDistance;
    let maxX = globalMinX + max * globalDistance;

    const padding = this.computeViewportPadding( minX, maxX );

    return [ minX - padding, maxX + padding ];
  }
}
