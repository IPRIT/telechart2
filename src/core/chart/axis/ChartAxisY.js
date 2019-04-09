import { AxisElementState, ChartAxis } from './ChartAxis';
import { setAttributeNS } from '../../../utils';

export class ChartAxisY extends ChartAxis {

  updatePositions () {
    this.eachElement(element => {
      const { valueElement, axisElement, value } = element;

      if (axisElement) {
        this._updatePathElementPosition( axisElement, value );
      }

      if (valueElement) {
        this._updateValueElementPosition( valueElement, value );
      }
    });
  }

  createValuesGroup () {
    this.valuesGroup = this.renderer.createGroup({
      class: 'telechart-chart-axes-values-y',
      transform: `translate(0, ${this.chart.seriesOffsetTop}) scale(1 1)`,
      mask: `url(#${this.chart.chartMaskId})`
    }, []);
  }

  createAxesGroup () {
    this.axesGroup = this.renderer.createGroup({
      class: 'telechart-chart-axes-y',
      transform: `translate(0, ${this.chart.seriesOffsetTop}) scale(1 1)`,
      mask: `url(#${this.chart.chartMaskId})`
    }, []);

    this.renderer.svgContainer.insertBefore( this.axesGroup, this.chart._seriesGroup );
  }

  computeAxisValues () {
    const chart = this.chart;
    const viewportMinY = chart.localMinY;
    const viewportMaxY = chart.localMaxY;
    const distance = viewportMaxY - viewportMinY;

    if (!distance) {
      return [];
    }

    let deltaY = distance / 5;
    let divider = Math.pow(10, Math.max(0, ( distance | 0 ).toString().length - 2) );
    deltaY = Math.floor( deltaY / divider ) * divider;

    let currentValue = 0;
    let result = [ currentValue ];

    while (currentValue + deltaY <= viewportMaxY) {
      result.unshift( currentValue + deltaY );
      currentValue += deltaY;
    }

    const maxLength = 6;
    if (result.length < maxLength) {
      currentValue = 0;
      while (currentValue - deltaY >= viewportMinY) {
        result.push( currentValue - deltaY );
        currentValue -= deltaY;
      }
    }

    return result;
  }

  /**
   * @param value
   * @param {boolean} initial
   * @return {{axisElement: SVGPathElement, valueElement: SVGTextElement, state: number, opacity: number, value: *}}
   */
  initializeWrapper (value, initial = false) {
    const axisElement = this.getFromAxesPool( value, initial );
    const valueElement = this.getFromValuesPool( value, initial );

    return {
      value,
      opacity: 0,
      animation: null,
      state: AxisElementState.showing,
      axisElement,
      valueElement
    };
  }

  onChartResize () {
    super.onChartResize();

    this._updateDimensions();
  }

  /**
   * @param value
   * @return {SVGPathElement}
   */
  createAxisElement (value) {
    value = value || 0;

    const pathText = this._computePathText( value );

    const element = this.renderer.createPath(pathText, {
      class: 'telechart-chart-axis-path',
      dataValue: value,
      stroke: 'rgba(163, 196, 220, 0.2)',
      strokeWidth: 1,
      strokeOpacity: 0,
      strokeLinejoin: 'round',
      strokeLinecap: 'round'
    }, this.axesGroup);

    this.restoreAxisElement( element, value );

    return element;
  }

  /**
   * @param value
   * @return {SVGTextElement}
   */
  createValueElement (value) {
    value = value || 0;

    const valueText = String( value );

    const element = this.renderer.createText(valueText, {
      class: 'telechart-chart-axis-value',
      x: this.chart.viewportPadding,
      textAnchor: 'start',
      fillOpacity: 0
    }, this.valuesGroup);

    this.restoreValueElement( element, value );

    return element;
  }

  initializePool () {
    this.initializeAxesPool();
    this.initializeValuesPool();
  }

  /**
   * @param element
   * @param value
   * @param initial
   */
  restoreAxisElement (element, value, initial = false) {
    super.restoreAxisElement( element, value, initial );

    value = value || 0;

    const pathText = this._computePathText( value );

    setAttributeNS( element, 'data-value', value, null );

    this.renderer.updatePath( element, pathText );
  }

  /**
   * @param element
   * @param value
   * @param initial
   */
  restoreValueElement (element, value, initial = false) {
    super.restoreValueElement( element, value, initial );

    value = value || 0;

    const valueText = String( value );
    const svgY = this._computeValuePosition( value );

    setAttributeNS( element, 'y', svgY, null );

    const tspan = element.querySelector( 'tspan' );
    tspan.textContent = valueText;
  }

  /**
   * @param value
   * @return {number}
   * @private
   */
  _computeValuePosition (value) {
    const fontOffsetY = 6;
    return this.chart.projectYToCanvas( value ) - fontOffsetY;
  }

  /**
   * @param {number} value
   * @return {string}
   * @private
   */
  _computePathText (value) {
    const svgY = this.chart.projectYToCanvas( value );
    const startSvgX = this.chart.viewportPadding;
    const endSvgX = this.chart.chartWidth - this.chart.viewportPadding;

    return `M${startSvgX} ${svgY}L${endSvgX} ${svgY}`;
  }

  /**
   * @private
   */
  _updateDimensions () {
    for (let i = 0; i < this.elements.length; ++i) {
      const { axisElement, value } = this.elements[ i ];
      this._updatePathElementPosition( axisElement, value );
    }
  }

  /**
   * @param axisElement
   * @param value
   * @private
   */
  _updatePathElementPosition (axisElement, value) {
    const pathText = this._computePathText( value );
    this.renderer.updatePath( axisElement, pathText );
  }

  /**
   * @param valueElement
   * @param value
   * @private
   */
  _updateValueElementPosition (valueElement, value) {
    const svgY = this._computeValuePosition( value || 0 );

    setAttributeNS( valueElement, 'y', svgY, null );
  }
}

