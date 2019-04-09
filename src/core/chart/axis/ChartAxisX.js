import { AxisElementState, ChartAxis } from './ChartAxis';
import { setAttributeNS } from '../../../utils';

export class ChartAxisX extends ChartAxis {

  /**
   * @type {*}
   */
  axesValuesMapping = {};

  /**
   * @type {number}
   */
  labelWidth = 37;

  /**
   * @type {number|null}
   * @private
   */
  _interval = null;

  /**
   * Update values positions
   */
  updatePositions () {
    this.eachElement(element => {
      const { valueElement, value } = element;

      if (valueElement) {
        this._updateValueElementPosition( valueElement, this.axesValuesMapping[ value ] );
      }
    });
  }

  createValuesGroup () {
    this.valuesGroup = this.renderer.createGroup({
      class: 'telechart-chart-axes-values-x',
      transform: `translate(0, ${this.chart.seriesOffsetTop + this.chart.chartHeight + 18}) scale(1 1)`
    }, []);
  }

  createAxesGroup () {
  }

  computeAxisValues () {
    const chart = this.chart;
    const chartWidth = chart.chartWidth;
    const minLabelWidth = 70;
    const pixelX = this.chart.viewportPixelX;
    const viewportMinX = chart.viewportRange[ 0 ];
    const viewportMaxX = chart.viewportRange[ 1 ];
    const distance = viewportMaxX - viewportMinX;

    if (!distance) {
      return [];
    }

    const maxAvailableLabels = chartWidth / minLabelWidth;

    if (this._interval == null) {
      this._interval = pixelX * chartWidth / maxAvailableLabels;
    }

    const intervalInPixels = this._interval / pixelX;
    if (intervalInPixels < minLabelWidth) {
      this._interval *= 2;
    } else if (intervalInPixels > minLabelWidth * 2) {
      this._interval *= .5;
    }

    let currentValue = viewportMaxX - pixelX * minLabelWidth / 2;

    if (this.axesValues.length > 0) {
      let foundByPrev = false;

      for (let i = this.axesValues.length - 1; i >= 0; --i) {
        const currentLastValue = this.axesValuesMapping[ this.axesValues[ i ] ];
        const prevValue = currentLastValue - this._interval;
        const nextValue = currentLastValue + this._interval;

        if (viewportMaxX > prevValue && viewportMaxX < nextValue) {
          currentValue = currentLastValue;
          foundByPrev = true;
          break;
        }
      }

      const currentLastValue = this.axesValuesMapping[ this.axesValues[ this.axesValues.length - 1 ] ];

      if (!foundByPrev && ( currentLastValue + this._interval * 2 >= viewportMaxX )) {
        currentValue = currentLastValue + this._interval;
      }
    }

    let result = [];

    while (currentValue >= viewportMinX) {
      result.unshift( currentValue );
      currentValue -= this._interval;
    }

    return result;
  }

  /**
   * @param value
   * @param {boolean} initial
   * @return {{axisElement: SVGPathElement, valueElement: SVGTextElement, state: number, opacity: number, value: *}}
   */
  initializeWrapper (value, initial = false) {
    const valueElement = this.getFromValuesPool( value, initial );

    return {
      value,
      opacity: 0,
      animation: null,
      state: AxisElementState.showing,
      axisElement: null,
      valueElement
    };
  }

  onChartResize () {
    super.onChartResize();
  }

  updateValues () {
    super.updateValues();

    const dates = this.axesValues.map(value => {
      return this._toDateString( value );
    });

    for (let i = 0; i < dates.length; ++i) {
      this.axesValuesMapping[ dates[ i ] ] = this.axesValues[ i ];
    }

    this.axesValues = dates;
  }

  /**
   * @param value
   * @return {SVGTextElement}
   */
  createValueElement (value = null) {
    const element = this.renderer.createText(value, {
      class: 'telechart-chart-axis-value',
      y: 0,
      textAnchor: 'start',
      fillOpacity: 0
    }, this.valuesGroup);

    this.restoreValueElement( element, value );

    return element;
  }

  initializePool () {
    this.initializeValuesPool();
  }

  /**
   * @param element
   * @param value
   * @param initial
   */
  restoreValueElement (element, value, initial = false) {
    super.restoreValueElement( element, value, initial );

    let svgX = 0;

    if (value !== null) {
      const timestamp = this.axesValuesMapping[ value ];
      svgX = this._computeValuePosition( timestamp );
    }

    setAttributeNS( element, 'x', svgX, null );

    const tspan = element.querySelector( 'tspan' );
    tspan.textContent = (value || '').split( ' ' ).slice( 0, 2 ).join( ' ' );
  }

  /**
   * @param value
   * @param lastValue
   * @return {number}
   * @private
   */
  _computeValuePosition (value, lastValue = false) {
    return this.chart.projectXToCanvas( value ) - this.labelWidth * .5;
  }

  /**
   * @param valueElement
   * @param value
   * @private
   */
  _updateValueElementPosition (valueElement, value) {
    setAttributeNS( valueElement, 'x', this._computeValuePosition( value ), null );
  }

  /**
   * @param {number} value
   * @return {string}
   * @private
   */
  _toDateString (value) {
    const date = new Date( value );
    const datePart = date.toUTCString().split( ' ' );

    return `${datePart[ 2 ]} ${datePart[ 1 ]} ${date.getFullYear()}`;
  }
}

