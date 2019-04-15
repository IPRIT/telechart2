import { BaseChart } from './BaseChart';
import { binarySearchIndexes, ChartVariables } from '../../utils';
import { ChartTypes } from './ChartTypes';
import { ChartEvents } from './events/ChartEvents';
import { Tween, TweenEvents } from '../animation/Tween';
import { TransitionEvents, TransitionPlayback } from '../animation/TransitionPlayback';
import { TelechartWorkerEvents } from '../worker/worker-events';

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

    if (this.minMaxYAnimation2 && this.minMaxYAnimation2.isRunning) {
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

    let lastOutput = [];
    for (let i = 0, len = this.series.length; i < len; ++i) {
      lastOutput = this.series[ i ].render( context, lastOutput );
    }
  }

  redrawUIOverlay () {
    if (this.redrawCursorRequested || this.telechart.forceRedraw) {
      this.redrawCursor();

      if (this.isLineChart) {
        this.redrawMarkers();
      }

      this.redrawCursorRequested = false;
    }
  }

  requestRedrawCursor () {
    this.redrawCursorRequested = true;
  }

  redrawCursor () {
    const context = this.telechart.uiContext;

    context.clearRect( 0, 0, this.chartWidth, ChartVariables.mainMaxHeight );

    if (this.isBarChart) {
      this.drawCursorBar( context );
    } else {
      this.drawCursorLine( context );
    }
  }

  drawCursorLine (context) {
    const colors = this.telechart.themeColors;

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

  drawCursorBar (context) {
    const colors = this.telechart.themeColors;

    const maskColor = colors.maskColor;
    const maskColorAlpha = colors.maskColorAlpha;

    context.globalAlpha = maskColorAlpha * this.cursorOpacity;
    context.fillStyle = maskColor;
    context.lineWidth = 1;

    const barWidthX = ( this.xAxis[ this.viewportPointsStep ] - this.xAxis[ 0 ] ) / this.viewportPixelX;
    const barHalfWidthX = barWidthX * .5;

    const x = this.projectXToCanvas( this.axisCursorPositionX );
    const x1 = -1;
    const x2 = x - barHalfWidthX + .3;
    const x3 = x + barHalfWidthX - .3;
    const x4 = this.chartWidth + 1;

    const y1 = this.seriesOffsetTop - 1;
    const y2 = this.seriesOffsetTop + this.chartHeight + 1;

    context.fillRect( x1, y1, x2 - x1, y2 - y1 );
    context.fillRect( x3, y1, x4 - x3, y2 - y1 );
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

      let canvasY = 0;

      if (this.isYScaled) {
        canvasY = i === 0
          ? this.projectYToCanvas( y )
          : this.projectYToCanvas2( y );
      } else {
        canvasY = this.projectYToCanvas( y );
      }

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
      const viewportRange = this.viewportRange;
      const insideViewportRange = viewportRange[0] <= oldX && oldX <= viewportRange[1];
      if (this._firstCursorAnimation || !insideViewportRange) {
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
    this.cursorAnimation.setToPosition( toX );
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

  onResize () {
    super.onResize();

    this._setInsideChartState( false, true );
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
    this.axisCursorPositionX = this.xAxis[ this.axisCursorPointIndex ];

    const indexChanged = this.axisCursorPointIndex !== oldIndex;

    if (indexChanged) {
      this.emit(ChartEvents.TRANSLATE_MARKERS, [
        this.axisCursorPositionX,
        this.xAxis[ oldIndex ]
      ]);
      this.emit( ChartEvents.REDRAW_CURSOR );
    }

    this._updateLabel( indexChanged );
  }

  _updateLabel (changed = true) {
    const lines = this._prepareLabelData();
    const viewportRange = this.viewportRange;

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
    const { top, left } = this.telechart.canvasOffset;
    const chartTop = pageY - top - this.seriesOffsetTop;
    const chartLeft = pageX - left;

    return chartTop >= 0 && chartTop <= this.chartHeight
      && chartLeft >= 0 && chartLeft <= this.chartWidth;
  }

  /**
   * @return {Array}
   * @private
   */
  _prepareLabelData () {
    const data = [];

    const index = this.axisCursorPointIndex;
    const x = this.xAxis[ index ];

    this.eachSeries(line => {
      data.push({
        color: line.color,
        label: line.label,
        name: line.name,
        visible: line.isVisible,
        x,
        y: line.yAxis[ index ],
        canvasY: this.projectYToCanvas( line.yAxis[ index ] ),
        canvasX: this.projectXToCanvas( line.xAxis[ index ] )
      });
    });

    return data;
  }
}
