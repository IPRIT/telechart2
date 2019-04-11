import { EventEmitter } from '../../misc/EventEmitter';
import {
  animationTimeout,
  arrayDiff,
  clampNumber,
  cssText,
  setAttributeNS,
  setAttributesNS
} from '../../../utils';
import { Tween, TweenEvents } from '../../animation/Tween';

export const AxisElementState = {
  pending: 1,
  showing: 2,
  hiding: 3
};

export class ChartAxis extends EventEmitter {

  /**
   * @type {Chart | BaseChart}
   */
  chart = null;

  /**
   * @type {Array<string | number>}
   */
  axesValues = [];

  /**
   * @type {Array<{animation: Tween, state: number, value: *, opacity: number}>}
   */
  elements = [];

  /**
   * @type {boolean}
   */
  updateAnimationsNeeded = false;

  /**
   * @type {boolean}
   */
  redrawNeeded = true;

  /**
   * @param {BaseChart | Chart} chart
   */
  constructor (chart) {
    super();

    this.chart = chart;
  }

  initialize () {
    this.updateValues();
    this.initializeWrappers();
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    if (this.hasActiveAnimations) {
      this.animationTick( deltaTime );
    }

    if (this.updateAnimationsNeeded) {
      this.updateAnimations();

      this.updateAnimationsNeeded = false;
    }
  }

  render () {
    if (this.redrawNeeded || this.chart.telechart.forceRedraw) {
      this.redraw();

      this.redrawNeeded = false;
    }
  }

  redraw () {
  }

  requestUpdateAnimations () {
    this.updateAnimationsNeeded = true;
  }

  requestRedraw () {
    this.redrawNeeded = true;
  }

  animationTick (deltaTime) {
    let hasAnimations = false;

    for (let i = 0; i < this.elements.length; ++i) {
      if (this.elements[ i ].animation) {
        this.elements[ i ].animation.update( deltaTime );
        this.redrawNeeded = true;
        hasAnimations = true;
      }
    }

    this.hasActiveAnimations = hasAnimations;
  }

  updateAnimations () {
    const oldValues = this.axesValues;

    this.updateValues();

    const valuesToDelete = arrayDiff( this.axesValues, oldValues );
    const valuesToCreate = this.axesValues.filter(value => {
      return oldValues.indexOf( value ) === -1;
    });

    this.createNewElements( valuesToCreate );
    this.deleteOldElements( valuesToDelete );
  }

  /**
   * @param valuesToCreate
   */
  createNewElements (valuesToCreate) {
    for (let i = 0; i < valuesToCreate.length; ++i) {
      const value = valuesToCreate[ i ];
      let element = this._getElementByValue( value );
      let created = false;

      if (element) {
        if (element.state === AxisElementState.pending) {
          // already attached
          continue;
        }

        if (element.state === AxisElementState.hiding) {
          if (element.animation) {
            element.animation.cancel();
          }
        }
      }

      if (!element) {
        element = this.initializeWrapper( value );
        created = true;
      }

      this.createShowingAnimation( element );

      if (created) {
        this.elements.push( element );
      }
    }
  }

  /**
   * @param value
   * @abstract
   */
  initializeWrapper (value) {
  }

  /**
   * @param valuesToDelete
   */
  deleteOldElements (valuesToDelete) {
    for (let i = 0; i < valuesToDelete.length; ++i) {
      const value = valuesToDelete[ i ];
      let element = this._getElementByValue( value );

      if (!element
        || element.state === AxisElementState.hiding) {
        // already hiding or deleted
        continue;
      }

      if (element.state === AxisElementState.showing) {
        const { animation: showing } = element;
        showing && showing.cancel();
      }

      this.createHidingAnimation( element );
    }
  }

  /**
   * @param {*} element
   * @return {number}
   */
  createShowingAnimation (element) {
    if (element.opacity === 1) {
      return ( element.state = AxisElementState.pending );
    }

    const onComplete = _ => {
      element.animation = null;
      element.state = AxisElementState.pending;
    };

    const animation = new Tween(element, 'opacity', 1, {
      duration: 250,
      timingFunction: 'easeInOutQuad'
    });
    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    element.animation = animation;
    element.state = AxisElementState.showing;

    this.hasActiveAnimations = true;
  }

  /**
   * @param {*} element
   */
  createHidingAnimation (element) {
    const onComplete = _ => {
      element.animation = null;
      element.state = AxisElementState.pending;

      this.detachElement( element );
    };

    const animation = new Tween(element, 'opacity', 0, {
      duration: 250,
      timingFunction: 'easeInOutQuad'
    });

    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    element.animation = animation;
    element.state = AxisElementState.hiding;

    this.hasActiveAnimations = true;
  }

  /**
   * @param {{state: *, value: *, valueElement: Element, axisElement: Element}} element
   */
  detachElement (element) {
    const { value } = element;
    const indexToDelete = this._getElementIndexByValue( value );

    this.elements.splice( indexToDelete, 1 );
  }

  initializeWrappers () {
    const values = this.axesValues;

    for (let i = 0; i < values.length; ++i) {
      const element = this.initializeWrapper( values[ i ] );

      // without animation
      element.state = AxisElementState.pending;
      element.opacity = 1;

      this.elements.push( element );
    }
  }

  /**
   * @return {Array<string | number>}
   */
  computeAxisValues () {
    return [];
  }

  /**
   * Updates axes values
   */
  updateValues () {
    this.axesValues = this.computeAxisValues();
  }

  onChartResize () {
    this.redrawNeeded = true;
    this.redraw();
  }

  /**
   * @param {Function} fn
   */
  eachElement (fn = () => {}) {
    for (let i = 0; i < this.elements.length; ++i) {
      fn( this.elements[ i ] );
    }
  }

  get textColor () {
    return this.chart.telechart.themeColors.axisTextColor;
  }

  get textColorAlpha () {
    return this.chart.telechart.themeColors.axisTextColorAlpha;
  }

  /**
   * @param value
   * @return {{state: *, value: *, valueElement: Element, axisElement: Element}}
   * @private
   */
  _getElementByValue (value) {
    for (let i = 0; i < this.elements.length; ++i) {
      const elementValue = this.elements[ i ].value;
      if (value === elementValue) {
        return this.elements[ i ];
      }
    }
  }

  /**
   * @param value
   * @return {number}
   * @private
   */
  _getElementIndexByValue (value) {
    for (let i = 0; i < this.elements.length; ++i) {
      if (value === this.elements[ i ].value) {
        return i;
      }
    }

    return -1;
  }
}
