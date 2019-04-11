import { AxisElementState, ChartAxis } from './ChartAxis';
import { ensureNumber } from '../../../utils';

export class ChartAxisY extends ChartAxis {

  /**
   * @type {*}
   */
  // axesValuesMapping = {};

  /**
   * @type {boolean}
   */
  isDoubleAxis = false;

  /**
   * @type {number}
   */
  fontSize = 12;

  /**
   * @param {BaseChart | Chart} chart
   * @param {boolean} isDoubleAxis
   */
  constructor (chart, isDoubleAxis) {
    super( chart );

    this.isDoubleAxis = isDoubleAxis;
  }

  redraw () {
    const context = this.chart.telechart.axisContext;

    context.clearRect( 0, 0, this.chart.chartWidth, this.chart.chartHeight + this.chart.seriesOffsetTop + this.chart.seriesOffsetBottom );

    this.drawLeft( context, true );
  }

  drawLeft (context, drawAxes = false) {
    const textColor = this.textColorLeft;
    const textColorAlpha = this.textColorLeftAlpha;
    const axesColor = this.axesColor;
    const axesColorAlpha = this.axesColorAlpha;

    const fontSize = this.fontSize;

    // values
    context.font = `${fontSize}px Arial`;
    context.fillStyle = textColor;
    context.textAlign = "left";

    // axes
    context.strokeStyle = axesColor;
    context.lineWidth = 1;

    const x = this.chart.viewportPadding;
    const axisWidth = this.chart.chartWidth - this.chart.viewportPadding * 2;

    for (let i = 0; i < this.elements.length; ++i) {
      const element = this.elements[ i ];
      const y = this._computeValuePosition( element.value );

      context.globalAlpha = textColorAlpha * element.opacity;
      context.fillText(element.formattedValue, x, y - 5);

      if (drawAxes) {
        context.globalAlpha = axesColorAlpha * element.opacity;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + axisWidth, y);
        context.stroke();
      }
    }
  }

  computeAxisValues () {
    const chart = this.chart;
    const viewportPixelY = this.chart.computeViewportPixelY( chart.localMinY, chart.localMaxY );
    const viewportMinY = chart.localMinY;
    const viewportMaxY = chart.localMaxY - (this.chart.seriesOffsetTop + this.fontSize) * viewportPixelY;
    const distance = viewportMaxY - viewportMinY;

    if (!distance) {
      return [];
    }

    let deltaY = distance / 5;

    let currentValue = viewportMinY;
    let result = [ currentValue ];

    for (let i = 0; i < 6; ++i) {
      result.unshift( currentValue + deltaY );
      currentValue += deltaY;
    }

    return result;
  }

  /**
   * @param value
   * @return {{animation: Tween, state: number, opacity: number, value: *}}
   */
  initializeWrapper (value) {
    return {
      value,
      formattedValue: this._formatNumber( value ),
      opacity: 0,
      animation: null,
      state: AxisElementState.showing
    };
  }

  updateValues () {
    super.updateValues();
  }

  get textColorLeft () {
    const yScaled = this.chart.isYScaled;

    return yScaled
      ? this.chart._series[ 0 ].color
      : this.textColor;
  }

  get textColorLeftAlpha () {
    const yScaled = this.chart.isYScaled;

    return yScaled
      ? 1
      : this.textColorAlpha;
  }

  get textColorRight () {
    const yScaled = this.chart.isYScaled;

    return yScaled
      ? this.chart._series[ 1 ].color
      : this.textColor;
  }

  get textColorRightAlpha () {
    const yScaled = this.chart.isYScaled;

    return yScaled
      ? 1
      : this.textColorAlpha;
  }

  get axesColor () {
    return this.chart.telechart.themeColors.axisColor;
  }

  get axesColorAlpha () {
    return this.chart.telechart.themeColors.axisColorAlpha;
  }

  /**
   * @param value
   * @return {number}
   * @private
   */
  _computeValuePosition (value) {
    return this.chart.projectYToCanvas( value );
  }

  /**
   * @param {number} value
   * @private
   */
  _formatNumber (value) {
    const v = Math.abs( ensureNumber( value ) );
    let symbol = '';

    const compressedValue = v >= 1.0e+9
      ? (symbol = 'B', v / 1.0e+9)
      : v >= 1.0e+6
        ? (symbol = 'M', v / 1.0e+6)
        : v >= 1.0e+3
          ? (symbol = 'K', v / 1.0e+3)
          : v;

    return Number( compressedValue.toFixed( symbol ? 1 : 0 ) ) + symbol;
  }
}

