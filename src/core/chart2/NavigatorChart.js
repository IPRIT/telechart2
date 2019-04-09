import { BaseChart } from './BaseChart';
import { ChartTypes } from './ChartTypes';
import { NavigatorChartEvents } from './events/NavigatorChartEvents';
import { Tween, TweenEvents } from '../animation/Tween';

import {
  ChartVariables,
  clampNumber
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
  _chartHeight = 40;

  /**
   * @type {number}
   * @private
   */
  _offsetY = ChartVariables.navigationChartOffsetY;

  /**
   * @type {number}
   * @private
   */
  _paddingTopBottom = 2;

  /**
   * @type {number}
   * @private
   */
  _paddingLeftRight = 11;

  /**
   * @type {number}
   * @private
   */
  _sliderControllerWidth = isTouchEventsSupported() ? 30 : 20;

  /**
   * @type {number}
   * @private
   */
  _sliderControllerOffset = isTouchEventsSupported() ? 17 : 12;

  /**
   * @type {number}
   * @private
   */
  _sliderWidth = 0;

  /**
   * @type {number}
   * @private
   */
  _sliderLeftRightBorderWidth = 5;

  /**
   * @type {Element}
   * @private
   */
  _overlayLeft = null;

  /**
   * @type {Element}
   * @private
   */
  _overlayRight = null;

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
   * @type {string}
   * @private
   */
  _overlayColor = 'rgba(240, 246, 249, 0.75)';

  /**
   * @type {boolean}
   * @private
   */
  _sliderUpdateNeeded = false;

  /**
   * @type {Array<number>}
   * @private
   */
  _navigatorRange = [ 0, 1 ];

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

    // this._createSliderEventsListeners();
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
    }
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
    this._sliderUpdateNeeded = true;

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
    return this._chartHeight + this._paddingTopBottom * 2;
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
