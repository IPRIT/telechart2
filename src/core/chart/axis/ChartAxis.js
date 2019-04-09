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
   * @type {SvgRenderer}
   */
  renderer = null;

  /**
   * @type {Chart | BaseChart}
   */
  chart = null;

  /**
   * @type {Element}
   */
  valuesGroup = null;

  /**
   * @type {Element}
   */
  axesGroup = null;

  /**
   * @type {Array<string | number>}
   */
  axesValues = [];

  /**
   * @type {Array<Element>}
   */
  valuesPool = [];

  /**
   * @type {number}
   */
  valuesElementsSize = 0;

  /**
   * @type {Array<Element>}
   */
  axesPool = [];

  /**
   * @type {number}
   */
  axesElementsSize = 0;

  /**
   * @type {number}
   */
  maxPoolSize = 200;

  /**
   * @type {number}
   */
  initialPoolSize = 0;

  /**
   * @type {Array<{state: number, value: *, opacity: number, valueElement: Element, axisElement: Element}>}
   */
  elements = [];

  /**
   * @type {boolean}
   */
  positionUpdateNeeded = false;

  /**
   * @type {boolean}
   */
  animationsUpdateNeeded = false;

  /**
   * @param {SvgRenderer} renderer
   */
  constructor (renderer) {
    super();

    this.renderer = renderer;
  }

  initialize () {
    this.createAxesGroup();
    this.createValuesGroup();

    this.initializePool();

    this.updateValues();
    this.initializeWrappers();
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    this._updateElementsAnimations( deltaTime );

    if (this.animationsUpdateNeeded) {
      this.updateAnimations();

      this.animationsUpdateNeeded = false;
    }

    if (this.positionUpdateNeeded) {
      this.updatePositions();

      this.positionUpdateNeeded = false;
    }
  }

  /**
   * Update position in next animation frame
   */
  requestUpdatePosition () {
    this.positionUpdateNeeded = true;
  }

  /**
   * Update position in next animation frame
   */
  requestUpdateAnimations () {
    this.animationsUpdateNeeded = true;
  }

  updatePositions () {
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
   * @param value
   * @param initial
   * @abstract
   */
  createValueElement (value, initial = false) {
  }

  /**
   * @param value
   * @param initial
   * @abstract
   */
  createAxisElement (value, initial = false) {
  }

  /**
   * @abstract
   */
  initializePool () {
  }

  /**
   * @abstract
   */
  initializeAxesPool () {
    this.addAxesToPool( this.initialPoolSize );
  }

  /**
   * @abstract
   */
  initializeValuesPool () {
    this.addValuesToPool( this.initialPoolSize );
  }

  /**
   * @param {number} size
   */
  addAxesToPool (size) {
    size = clampNumber( size, 0, this.maxPoolSize - this.axesElementsSize );

    this.axesElementsSize += size;

    for (let i = 0; i < size; ++i) {
      this.axesPool.push(
        this.createAxisElement()
      );
    }
  }

  /**
   * @param {number} size
   */
  addValuesToPool (size) {
    size = clampNumber( size, 0, this.maxPoolSize - this.valuesElementsSize );

    this.valuesElementsSize += size;

    for (let i = 0; i < size; ++i) {
      this.valuesPool.push(
        this.createValueElement()
      );
    }
  }

  /**
   * @param value
   * @param initial
   * @return {*}
   */
  getFromAxesPool (value, initial = false) {
    let element = this.axesPool.shift();

    if (!element) {
      this.addAxesToPool( 1 );

      element = this.axesPool.shift();

      if (!element) {
        return console.warn( 'Axes pool is empty and reached maximum size' );
      }
    }

    this.restoreAxisElement( element, value, initial );

    return element;
  }

  /**
   * @param value
   * @param initial
   * @return {*}
   */
  getFromValuesPool (value, initial = false) {
    let element = this.valuesPool.shift();

    if (!element) {
      this.addValuesToPool( 1 );

      element = this.valuesPool.shift();

      if (!element) {
        return console.warn( 'Values pool is empty and reached maximum size' );
      }
    }

    this.restoreValueElement( element, value, initial );

    return element;
  }

  /**
   * @param {Element} element
   */
  returnToValuesPool (element) {
    this.valuesPool.push( element );
  }

  /**
   * @param {Element} element
   */
  returnToAxesPool (element) {
    this.axesPool.push( element );
  }

  /**
   * @param element
   * @param value
   * @param initial
   */
  restoreAxisElement (element, value, initial = false) {
    setAttributeNS( element, 'stroke-opacity', Number( initial ), null );
  }

  /**
   * @param element
   * @param value
   * @param initial
   */
  restoreValueElement (element, value, initial = false) {
    if (!initial) {
      return setAttributeNS( element, 'fill-opacity', 0, null );
    }

    setAttributesNS(element, {
      fillOpacity: 1,
      style: cssText({
        opacity: 0,
      })
    });

    return animationTimeout( 200 ).then(_ => {
      setAttributeNS(element, 'style', cssText({
        opacity: 1,
        transitionDuration: '.3s',
        transitionProperty: 'all'
      }), null);

      return animationTimeout( 300 );
    }).then(_ => {
      setAttributeNS( element, 'style', '', null );
    });
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
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });
    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    element.animation = animation;
    element.state = AxisElementState.showing;
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
      duration: 300,
      timingFunction: 'easeInOutQuad'
    });

    animation.on( TweenEvents.COMPLETE, onComplete );
    animation.start();

    element.animation = animation;
    element.state = AxisElementState.hiding;
  }

  /**
   * @param {{state: *, value: *, valueElement: Element, axisElement: Element}} element
   */
  detachElement (element) {
    const { value, valueElement, axisElement } = element;
    const indexToDelete = this._getElementIndexByValue( value );

    if (valueElement) {
      this.returnToValuesPool( valueElement );
    }

    if (axisElement) {
      this.returnToAxesPool( axisElement );
    }

    if (indexToDelete < 0) {
      return;
    }

    this.elements.splice( indexToDelete, 1 );
  }

  /**
   * @param {Chart | BaseChart} chart
   */
  setChart (chart) {
    this.chart = chart;
  }

  /**
   * @abstract
   */
  createValuesGroup () {
  }

  /**
   * @abstract
   */
  createAxesGroup () {
  }

  initializeWrappers () {
    const values = this.axesValues;

    for (let i = 0; i < values.length; ++i) {
      const element = this.initializeWrapper( values[ i ], true );

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
  }

  /**
   * @param {Function} fn
   */
  eachElement (fn = () => {}) {
    for (let i = 0; i < this.elements.length; ++i) {
      fn( this.elements[ i ] );
    }
  }

  /**
   * @param value
   * @return {{state: *, value: *, valueElement: Element, axisElement: Element}}
   * @private
   */
  _getElementByValue (value) {
    for (let i = 0; i < this.elements.length; ++i) {
      const { value: elementValue } = this.elements[ i ];
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
   * @param {number} deltaTime
   * @private
   */
  _updateElementsAnimations (deltaTime) {
    this.eachElement(element => {
      this._updateElementAnimation( element, deltaTime );
    })
  }

  /**
   * @param element
   * @param deltaTime
   * @private
   */
  _updateElementAnimation (element, deltaTime) {
    if (!element.animation) {
      return;
    }

    const { axisElement, valueElement, animation } = element;

    animation.update( deltaTime );

    if (axisElement) {
      setAttributeNS( axisElement, 'stroke-opacity', element.opacity, null )
    }

    if (valueElement) {
      setAttributeNS( valueElement, 'fill-opacity', element.opacity, null );
    }
  }
}
