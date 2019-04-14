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
   * @type {Array}
   */
  animations = [];

  /**
   * @type {boolean}
   */
  updateAnimationsNeeded = false;

  /**
   * @type {boolean}
   */
  redrawNeeded = true;

  /**
   * @type {number}
   */
  fontSize = 12;

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

    for (let i = 0; i < this.animations.length; ++i) {
      const animation = this.animations[ i ];
      if (animation && animation.isRunning) {
        animation.update( deltaTime );
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
    let elements = [];

    for (let i = 0; i < valuesToCreate.length; ++i) {
      let element = this._getElementByValue( valuesToCreate[ i ] );

      if (element
        && element.state === AxisElementState.showing) {
        continue;
      }

      if (!element) {
        element = this.initializeWrapper( valuesToCreate[ i ] );
        element.startOpacity = 0;
        this.elements.push( element );
      } else if (element.animation) {
        element.startOpacity = element.animationObject.opacity;
      } else {
        element.startOpacity = 0;
      }

      elements.push( element );
    }

    if (elements.length) {
      const animation = this.createShowingAnimation( elements );
      this.animations.push( animation );
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
    let elements = [];

    for (let i = 0; i < valuesToDelete.length; ++i) {
      let element = this._getElementByValue( valuesToDelete[ i ] );

      if (!element
        || element.state === AxisElementState.hiding) {
        // already hiding or deleted
        continue;
      }

      if (element.animation) {
        element.startOpacity = element.animationObject.opacity;
      } else {
        element.startOpacity = 1;
      }

      elements.push( element );
    }

    if (elements.length) {
      const animation = this.createHidingAnimation( elements );

      this.animations.push( animation );
    }
  }

  /**
   * @param {*} elements
   * @return {Tween}
   */
  createShowingAnimation (elements) {
    const onComplete = _ => {
      for (let i = 0; i < elements.length; ++i) {
        const element = elements[ i ];

        if (element.animationId === animation.id) {
          element.animation = null;
          element.animationId = null;
          element.animationObject = null;
          element.state = AxisElementState.pending;
          element.opacity = 1;
        }
      }

      this.detachAnimation( animation );
    };

    const animationObject = {
      opacity: 0
    };

    const animation = new Tween(animationObject, 'opacity', 1, {
      duration: 200,
      timingFunction: 'easeInOutQuad'
    });
    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    for (let i = 0; i < elements.length; ++i) {
      const element = elements[ i ];
      element.animation = animation;
      element.animationId = animation.id;
      element.animationObject = animationObject;
      element.startOpacity = element.startOpacity || 0;
      element.opacityScale = 1 - element.startOpacity;
      element.state = AxisElementState.showing;
    }

    this.hasActiveAnimations = true;

    return animation;
  }

  /**
   * @param {*} elements
   * @return {Tween}
   */
  createHidingAnimation (elements) {
    const onComplete = _ => {
      for (let i = 0; i < elements.length; ++i) {
        const element = elements[ i ];

        if (element.animationId === animation.id) {
          element.animation = null;
          element.animationId = null;
          element.animationObject = null;
          element.state = AxisElementState.pending;
          element.opacity = 0;

          this.detachElement( element );
        }
      }

      this.detachAnimation( animation );
    };

    const animationObject = {
      opacity: 1
    };

    const animation = new Tween(animationObject, 'opacity', 0, {
      duration: 150,
      timingFunction: 'easeInOutQuad'
    });

    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    for (let i = 0; i < elements.length; ++i) {
      const element = elements[ i ];
      element.animation = animation;
      element.animationId = animation.id;
      element.animationObject = animationObject;
      element.startOpacity = element.startOpacity || 1;
      element.opacityScale = element.startOpacity;
      element.state = AxisElementState.hiding;
    }

    this.hasActiveAnimations = true;

    return animation;
  }

  /**
   * @param {{state: *, value: *, id: number, animation: Tween}} element
   */
  detachElement (element) {
    const indexToDelete = this._getElementIndexById( element.id );
    this.elements.splice( indexToDelete, 1 );
  }

  /**
   * @param {Tween} animation
   */
  detachAnimation (animation) {
    const indexToDelete = this._getAnimationIndexById( animation.id );
    this.animations.splice( indexToDelete, 1 );
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
   * @return {{animation: Tween, state: number, value: *, opacity: number}}
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

  /**
   * @param id
   * @return {number}
   * @private
   */
  _getElementIndexById (id) {
    for (let i = 0; i < this.elements.length; ++i) {
      if (id === this.elements[ i ].id) {
        return i;
      }
    }

    return -1;
  }

  /**
   * @param id
   * @return {number}
   * @private
   */
  _getAnimationIndexById (id) {
    for (let i = 0; i < this.animations.length; ++i) {
      if (id === this.animations[ i ].id) {
        return i;
      }
    }

    return -1;
  }
}
