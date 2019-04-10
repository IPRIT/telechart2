import { BaseChart } from './BaseChart';
import { ChartTypes } from './ChartTypes';
import { NavigatorChartEvents } from './events/NavigatorChartEvents';
import { Tween, TweenEvents } from '../animation/Tween';

import {
  animationTimeout,
  ChartVariables,
  clampNumber, drawRoundedRect
} from '../../utils';

export class NavigatorChart extends BaseChart {

  /**
   * @type {string}
   * @private
   */
  _type = ChartTypes.navigatorChart;

  /**
   * @type {number}
   * @private
   */
  _overlayPaddingTopBottom = 1;

  /**
   * @type {number}
   * @private
   */
  _paddingLeftRight = 12;

  /**
   * @type {number}
   * @private
   */
  _viewportPadding = 0;

  /**
   * @type {number}
   * @private
   */
  _sliderWidth = 0;

  /**
   * @type {number}
   * @private
   */
  _sliderLeftRightBorderWidth = 9;

  /**
   * @type {number}
   * @private
   */
  _overlayLeftWidth = 0;

  /**
   * @type {number}
   * @private
   */
  _overlayRightWidth = 0;

  /**
   * @type {boolean}
   * @private
   */
  redrawSliderUINeeded = true;

  /**
   * @type {Array<number>}
   * @private
   */
  _navigatorRange = [ .8 - ChartVariables.initialViewportScale, .8 ];
  _navigatorRange = [ 1 - ChartVariables.initialViewportScale, 1 ];

  /**
   * @type {Tween}
   * @private
   */
  _navigatorRangeAnimation = null;

  /**
   * @type {*}
   * @private
   */
  _navigationRangeAnimationObject = null;

  /**
   * @type {number}
   * @private
   */
  _navigatorMinRangeDistance = .075;

  /**
   * @type {string}
   * @private
   */
  _navigatorChangeDirection = 'right';

  /**
   * Initializes navigator chart
   */
  initialize () {
    super.initialize();

    this._updateNavigatorDimensions();

    if (this._series[ 0 ].name === 'Joined') {
      const f = _ => {
        animationTimeout( Math.random() * 2000 + 500 ).then(_ => {
          const min = Math.random() * .4;
          const max = min + Math.random() * ( 1 - min );
          this.animateNavigationRangeTo( min, max );
          f();
        });
      };

      f();
    }
  }

  update (deltaTime) {
    super.update( deltaTime );

    const hasRangeAnimation = this._navigatorRangeAnimation && this._navigatorRangeAnimation.isRunning;
    if (hasRangeAnimation) {
      this._navigatorRangeAnimation.update( deltaTime );

      this.updateNavigationRange(
        this._navigationRangeAnimationObject.from,
        this._navigationRangeAnimationObject.to
      );

      this.redrawSliderUINeeded = true;
    }
  }

  render () {
    super.render();

    if (this.redrawSliderUINeeded || this.telechart.forceRedraw) {
      this.redrawSliderUI();

      this.redrawSliderUINeeded = false;
    }
  }

  redrawChart () {
    const context = this.telechart.navigationSeriesContext;
    context.clearRect( 0, 0, this.chartWidth, this.chartHeight );

    this.eachSeries(line => {
      line.render( context );
    });
  }

  redrawSliderUI () {
    const context = this.telechart.navigationUIContext;

    context.clearRect( 0, 0, this.chartWidth, this.navigatorHeight );

    this.redrawSliderOverlays( context );
    this.redrawSlider( context );
  }

  redrawSliderOverlays (context) {
    const overlayLeftWidth = this._overlayLeftWidth;
    const overlayRightWidth = this._overlayRightWidth;

    const colors = this.telechart.themeColors;

    if (overlayLeftWidth) {
      context.globalAlpha = colors.sliderOverlayAlpha;
      context.fillStyle = colors.sliderOverlay;

      drawRoundedRect(
        context,
        this._paddingLeftRight,
        this._overlayPaddingTopBottom,
        overlayLeftWidth + this._sliderLeftRightBorderWidth,
        this.navigatorHeight - this._overlayPaddingTopBottom * 2, {
          tl: 8,
          bl: 8
        }
      );

      context.fill();
    }

    context.globalAlpha = colors.sliderOverlayAlpha;
    context.fillStyle = colors.sliderOverlay;

    if (overlayRightWidth) {
      drawRoundedRect(
        context,
        this._paddingLeftRight + this.navigatorWidth - overlayRightWidth - this._sliderLeftRightBorderWidth,
        this._overlayPaddingTopBottom,
        overlayRightWidth + this._sliderLeftRightBorderWidth,
        this.navigatorHeight - this._overlayPaddingTopBottom * 2, {
          tr: 8,
          br: 8
        }
      );

      context.fill();
    }
  }

  redrawSlider (context) {
    const overlayLeftWidth = this._overlayLeftWidth;
    const overlayRightWidth = this._overlayRightWidth;

    const colors = this.telechart.themeColors;

    context.globalAlpha = 1;
    context.fillStyle = colors.sliderBorder;
    context.strokeStyle = colors.sliderBorder;

    const topBottomPadding = 0;

    // left border
    drawRoundedRect(
      context,
      this._paddingLeftRight + overlayLeftWidth, topBottomPadding,
      this._sliderLeftRightBorderWidth, this.navigatorHeight - 2 * topBottomPadding, {
        tl: 6,
        bl: 6
      }
    );
    context.fill();

    // right border
    drawRoundedRect(
      context,
      this._paddingLeftRight + this.navigatorWidth - overlayRightWidth - this._sliderLeftRightBorderWidth, topBottomPadding,
      this._sliderLeftRightBorderWidth, this.navigatorHeight - 2 * topBottomPadding, {
        tr: 6,
        br: 6
      }
    );
    context.fill();

    context.strokeStyle = colors.sliderBorder;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(
      this._paddingLeftRight + overlayLeftWidth + this._sliderLeftRightBorderWidth,
      topBottomPadding
    );
    context.lineTo(
      this._paddingLeftRight + this.navigatorWidth - overlayRightWidth - this._sliderLeftRightBorderWidth,
      topBottomPadding
    );
    context.stroke();

    context.beginPath();
    context.moveTo(
      this._paddingLeftRight + overlayLeftWidth + this._sliderLeftRightBorderWidth,
      this.navigatorHeight - topBottomPadding
    );
    context.lineTo(
      this._paddingLeftRight + this.navigatorWidth - overlayRightWidth - this._sliderLeftRightBorderWidth,
      this.navigatorHeight - topBottomPadding
    );
    context.stroke();

    // borders pins
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const pinHeight = 0.2 * this.navigatorHeight;

    const x1 = this._paddingLeftRight + overlayLeftWidth + this._sliderLeftRightBorderWidth / 2;
    const y1 = this.navigatorHeight / 2 - pinHeight / 2;
    const x2 = this._paddingLeftRight + this.navigatorWidth - overlayRightWidth - this._sliderLeftRightBorderWidth / 2;
    const y2 = this.navigatorHeight / 2 + pinHeight / 2;

    context.beginPath();
    context.moveTo( x1, y1 );
    context.lineTo( x1, y2 );
    context.stroke();

    context.beginPath();
    context.moveTo( x2, y1 );
    context.lineTo( x2, y2 );
    context.stroke();
  }

  onResize () {
    super.onResize();

    this._updateNavigatorDimensions();
    this.redrawSliderUI();
  }

  /**
   * @param {number} min
   * @param {number} max
   * @param {*} options
   */
  animateNavigationRangeTo (min = 0, max = 1, options = {}) {
    const {
      duration = 300,
      timingFunction = 'easeInOutQuad'
    } = options;

    const [ newMin, newMax ] = this._clampNavigationRange( min, max );

    if (this._navigatorRangeAnimation) {
      return this._navigatorRangeAnimation.patchAnimation( [ newMin, newMax ] );
    }

    this._navigationRangeAnimationObject = {
      from: this._navigatorRange[ 0 ],
      to: this._navigatorRange[ 1 ]
    };

    this._navigatorRangeAnimation = new Tween(this._navigationRangeAnimationObject, [ 'from', 'to' ], [
      newMin, newMax
    ], {
      duration, timingFunction
    });

    const onFinished = _ => {
      this._navigatorRangeAnimation = null;
    };

    this._navigatorRangeAnimation.on( TweenEvents.COMPLETE, onFinished );
    this._navigatorRangeAnimation.on( TweenEvents.CANCELLED, onFinished );

    this._navigatorRangeAnimation.start();

    this.emit( NavigatorChartEvents.ANIMATE_RANGE, [ newMin, newMax ] );
  }

  /**
   * @param {number} min
   * @param {number} max
   * @param {boolean} emitChange
   */
  setNavigationRange (min = 0, max = 1, { emitChange = true } = {}) {
    [ min, max ] = this._clampNavigationRange( min, max );
    this._navigatorRange = [ min, max ];

    this._updateNavigatorDimensions();
    this.redrawSliderUINeeded = true;

    if (emitChange) {
      this.emit( NavigatorChartEvents.RANGE_CHANGED, this._navigatorRange );
    }
  }

  /**
   * @param {number} min
   * @param {number} max
   */
  updateNavigationRange (min, max) {
    this.setNavigationRange( min, max, { emitChange: false } );
  }

  /**
   * @return {number}
   */
  get chartHeight () {
    return ChartVariables.navigationChartHeight;
  }

  /**
   * @return {number}
   */
  get navigatorWidth () {
    return this.chartWidth - this._paddingLeftRight * 2;
  }

  /**
   * @return {number}
   */
  get navigatorHeight () {
    return ChartVariables.navigationChartUIHeight;
  }

  /**
   * @return {number}
   */
  get seriesOffsetTop () {
    return 0;
  }

  /**
   * @return {CanvasRenderingContext2D}
   */
  get seriesContext () {
    return this.telechart.navigationSeriesContext;
  }

  /**
   * @return {CanvasRenderingContext2D}
   */
  get uiContext () {
    return this.telechart.navigationUIContext;
  }

  /**
   * @private
   */
  _updateNavigatorDimensions () {
    const overlayLeftScale = this._navigatorRange[ 0 ];
    const overlayRightScale = ( 1 - this._navigatorRange[ 1 ] );
    const navigatorWidth = this.navigatorWidth;

    this._overlayLeftWidth = navigatorWidth * overlayLeftScale;
    this._overlayRightWidth = navigatorWidth * overlayRightScale;
    this._sliderWidth = navigatorWidth - this._overlayLeftWidth - this._overlayRightWidth;
  }

  /**
   * @param {number} min
   * @param {number} max
   * @param {boolean} preserveDistance
   * @return {Array<number>}
   * @private
   */
  _clampNavigationRange (min = 0, max = 1, preserveDistance = false) {
    const preservedDistance = clampNumber( max - min, this._navigatorMinRangeDistance, 1 );

    min = clampNumber( min, 0, 1 );
    max = clampNumber( max, 0, 1 );

    const isRightController = this._navigatorChangeDirection === 'right';

    const distance = max - min;
    const minDistance = preserveDistance
      ? preservedDistance
      : this._navigatorMinRangeDistance;

    if (distance < minDistance) {
      if (isRightController) {
        if (max - minDistance >= 0) {
          min = max - minDistance;
        } else {
          min = 0;
          max = minDistance;
        }
      } else {
        if (min + minDistance <= 1) {
          max = min + minDistance;
        } else {
          max = 1;
          min = 1 - minDistance;
        }
      }
    }

    return [ min, max ];
  }

  /**
   * @private
   */
  _createSliderEventsListeners () {
    // slider
    const touchStartListener = this._onSliderTouchStart.bind( this );
    const touchMoveListener = this._onSliderTouchMove.bind( this );
    const touchEndListener = this._onSliderTouchEnd.bind( this );
    const mouseDownListener = this._onSliderMouseDown.bind( this );

    this._slider.addEventListener( 'touchstart', touchStartListener, { passive: false } );
    this._slider.addEventListener( 'touchmove', touchMoveListener, { passive: false } );
    this._slider.addEventListener( 'touchend', touchEndListener );

    this._slider.addEventListener( 'mousedown', mouseDownListener );

    // slider controllers
    // left
    const controllerLeftTouchStartListener = this._onSliderControllerTouchStart.bind( this, 'left' );
    const controllerLeftTouchMoveListener = this._onSliderControllerTouchMove.bind( this );
    const controllerLeftTouchEndListener = this._onSliderControllerTouchEnd.bind( this );
    const controllerLeftMouseDownListener = this._onSliderControllerMouseDown.bind( this, 'left' );

    //right
    const controllerRightTouchStartListener = this._onSliderControllerTouchStart.bind( this, 'right' );
    const controllerRightTouchMoveListener = this._onSliderControllerTouchMove.bind( this );
    const controllerRightTouchEndListener = this._onSliderControllerTouchEnd.bind( this );
    const controllerRightMouseDownListener = this._onSliderControllerMouseDown.bind( this, 'right' );

    // left
    this._sliderControllerLeft.addEventListener( 'touchstart', controllerLeftTouchStartListener, { passive: false } );
    this._sliderControllerLeft.addEventListener( 'touchmove', controllerLeftTouchMoveListener, { passive: false } );
    this._sliderControllerLeft.addEventListener( 'touchend', controllerLeftTouchEndListener );
    this._sliderControllerLeft.addEventListener( 'mousedown', controllerLeftMouseDownListener );

    // right
    this._sliderControllerRight.addEventListener( 'touchstart', controllerRightTouchStartListener, { passive: false } );
    this._sliderControllerRight.addEventListener( 'touchmove', controllerRightTouchMoveListener, { passive: false } );
    this._sliderControllerRight.addEventListener( 'touchend', controllerRightTouchEndListener );
    this._sliderControllerRight.addEventListener( 'mousedown', controllerRightMouseDownListener );

    // overlays
    const overlayLeftClickListener = this._onSliderOverlayClick.bind( this, 'left' );
    const overlayRightClickListener = this._onSliderOverlayClick.bind( this, 'right' );

    this._overlayLeft.addEventListener( 'click', overlayLeftClickListener );
    this._overlayRight.addEventListener( 'click', overlayRightClickListener );
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onSliderTouchStart (ev) {
    const {
      pageX, pageY
    } = ev.targetTouches[ 0 ];

    this._sliderStartEvent = {
      pageX, pageY
    };

    this._sliderStartPosition = this._navigatorRange.slice();
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onSliderTouchMove (ev) {
    const targetTouch = ev.targetTouches[ 0 ];

    const {
      pageX: startPageX
    } = this._sliderStartEvent;

    const {
      pageX = 0
    } = targetTouch;

    const positionDelta = ( startPageX - pageX ) / this.navigatorWidth;

    const startPosition = this._sliderStartPosition;

    let [ min, max ] = this._clampNavigationRange(
      startPosition[ 0 ] - positionDelta,
      startPosition[ 1 ] - positionDelta,
      true
    );

    this.setNavigationRange( min, max );

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
  }

  /**
   * @param ev
   * @private
   */
  _onSliderTouchEnd (ev) {
    if (ev.cancelable) {
      ev.preventDefault();
    }

    this._isSliderScrollingAction = null;
  }

  /**
   * @param {MouseEvent} ev
   * @private
   */
  _onSliderMouseDown (ev) {
    const {
      pageX, pageY
    } = ev;

    this._sliderStartEvent = {
      pageX, pageY
    };

    this._sliderStartPosition = this._navigatorRange.slice();

    const sliderMouseMoveListener = this._onSliderMouseMove.bind( this );

    const lastBodyStyle = document.body.getAttribute( 'style' );
    setAttributeNS( document.body, 'style', cssText({ cursor: 'grabbing' }), null );
    setAttributeNS( this._slider, 'style', cssText({ cursor: 'grabbing' }), null );

    document.addEventListener('mousemove', sliderMouseMoveListener);
    document.addEventListener('mouseup', ev => {
      if (lastBodyStyle) {
        setAttributeNS( document.body, 'style', lastBodyStyle, null );
      } else {
        document.body.removeAttribute( 'style' );
      }
      setAttributeNS( this._slider, 'style', cssText({ cursor: 'grab' }), null );

      document.removeEventListener( 'mousemove', sliderMouseMoveListener )
    });
  }

  /**
   * @param {MouseEvent} ev
   * @private
   */
  _onSliderMouseMove (ev) {
    ev.preventDefault();

    const {
      pageX: startPageX
    } = this._sliderStartEvent;

    const {
      pageX = 0
    } = ev;

    const positionDelta = ( startPageX - pageX ) / this.navigatorWidth;

    const startPosition = this._sliderStartPosition;

    let [ min, max ] = this._clampNavigationRange(
      startPosition[ 0 ] - positionDelta,
      startPosition[ 1 ] - positionDelta,
      true
    );

    this.setNavigationRange( min, max );
  }

  /**
   * @param {string} direction
   * @param {TouchEvent} ev
   * @private
   */
  _onSliderControllerTouchStart (direction, ev) {
    const {
      pageX, pageY
    } = ev.targetTouches[ 0 ];

    this._sliderControllerStartPosition = this._navigatorRange.slice();
    this._navigatorChangeDirection = direction;
    this._sliderControllerStartEvent = {
      pageX, pageY
    };
  }

  /**
   * @param {TouchEvent} ev
   * @private
   */
  _onSliderControllerTouchMove (ev) {
    const targetTouch = ev.targetTouches[ 0 ];

    const {
      pageX: startPageX
    } = this._sliderControllerStartEvent;

    const {
      pageX = 0
    } = targetTouch;

    const positionDelta = ( startPageX - pageX ) / this.navigatorWidth;
    const startPosition = this._sliderControllerStartPosition;
    const isLeft = this._navigatorChangeDirection === 'left';

    let [ min, max ] = [
      startPosition[ 0 ] - ( isLeft ? positionDelta : 0 ),
      startPosition[ 1 ] - ( !isLeft ? positionDelta : 0 )
    ];

    [ min, max ] = this._clampNavigationRange( min, max );

    if (isLeft) {
      this._sliderControllerStartPosition[ 1 ] = max;
    } else {
      this._sliderControllerStartPosition[ 0 ] = min;
    }

    this.setNavigationRange( min, max );

    if (this._isSliderControllerScrollingAction === null) {
      const {
        pageX: startPageX,
        pageY: startPageY
      } = this._sliderControllerStartEvent;

      const deltaY = Math.abs( startPageY - targetTouch.pageY );
      const deltaX = Math.abs( startPageX - targetTouch.pageX );

      this._isSliderControllerScrollingAction = deltaY >= deltaX;
    }

    if (!this._isSliderControllerScrollingAction) {
      ev.preventDefault();
    }
  }

  /**
   * @param ev
   * @private
   */
  _onSliderControllerTouchEnd (ev) {
    if (ev.cancelable) {
      ev.preventDefault();
    }

    this._isSliderControllerScrollingAction = null;
  }

  /**
   * @param {string} direction
   * @param {MouseEvent} ev
   * @private
   */
  _onSliderControllerMouseDown (direction, ev) {
    const {
      pageX, pageY
    } = ev;

    this._sliderControllerStartPosition = this._navigatorRange.slice();
    this._navigatorChangeDirection = direction;
    this._sliderControllerStartEvent = {
      pageX, pageY
    };

    const mouseMoveListener = this._onSliderControllerMouseMove.bind( this );

    const lastBodyStyle = document.body.getAttribute( 'style' );
    setAttributeNS( document.body, 'style', cssText({ cursor: 'e-resize' }), null );

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', ev => {
      if (lastBodyStyle) {
        setAttributeNS( document.body, 'style', lastBodyStyle, null );
      } else {
        document.body.removeAttribute( 'style' );
      }

      document.removeEventListener( 'mousemove', mouseMoveListener )
    });
  }

  /**
   * @param {MouseEvent} ev
   * @private
   */
  _onSliderControllerMouseMove (ev) {
    ev.preventDefault();

    const {
      pageX: startPageX
    } = this._sliderControllerStartEvent;

    const {
      pageX = 0
    } = ev;

    const positionDelta = ( startPageX - pageX ) / this.navigatorWidth;
    const startPosition = this._sliderControllerStartPosition;
    const isLeft = this._navigatorChangeDirection === 'left';

    let [ min, max ] = [
      startPosition[ 0 ] - ( isLeft ? positionDelta : 0 ),
      startPosition[ 1 ] - ( !isLeft ? positionDelta : 0 )
    ];

    [ min, max ] = this._clampNavigationRange( min, max );

    if (isLeft) {
      this._sliderControllerStartPosition[ 1 ] = max;
    } else {
      this._sliderControllerStartPosition[ 0 ] = min;
    }

    this.setNavigationRange( min, max );
  }

  /**
   * @param {string} direction
   * @param {MouseEvent} ev
   * @private
   */
  _onSliderOverlayClick (direction, ev) {
    const position = this._resolveNavigatorPosition( ev );
    const halfDistance = ( this._navigatorRange[ 1 ] - this._navigatorRange[ 0 ] ) * .5;

    const [ min, max ] = this._clampNavigationRange(
      position - halfDistance,
      position + halfDistance,
      true
    );

    this.animateNavigationRangeTo( min, max );
  }

  /**
   * @param {number} pageX
   * @param {number} pageY
   * @private
   */
  _resolveNavigatorPosition ({ pageX, pageY }) {
    const left = ChartVariables.chartPaddingLeftRight;
    return ( pageX - left ) / this.navigatorWidth;
  }
}
