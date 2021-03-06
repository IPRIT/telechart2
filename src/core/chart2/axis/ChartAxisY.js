import { AxisElementState, ChartAxis } from './ChartAxis';
import { ensureNumber } from '../../../utils';

let AUTOINCREMENT_ID = 1;

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
   * @param {BaseChart | Chart} chart
   * @param {boolean} isDoubleAxis
   */
  constructor (chart, isDoubleAxis) {
    super( chart );

    this.isDoubleAxis = isDoubleAxis;
  }

  redraw () {
    const context = this.chart.telechart.axisContext;

    context.clearRect( 0, 0, this.chart.chartWidth, this.chart.chartHeight + this.chart.seriesOffsetTop + 1 );

    const firstLine = this.chart.series[ 0 ];
    const drawAxes = !this.isDoubleAxis || firstLine.isVisible;

    this.drawLeft( context, drawAxes );
  }

  drawLeft (context, drawAxes = false) {
    const line = this.chart.series[ 0 ];

    if (this.isDoubleAxis && line.opacity <= 0) {
      return;
    }

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

    const topBorder = 0;
    const bottomBorder = this.chart.chartHeight + this.chart.seriesOffsetTop + this.chart.seriesOffsetBottom;

    const normalCount = 6 * 2 + 1;
    const realCount = this.elements.length;
    const reduceDrawings = normalCount < realCount;
    const opacityThreshold = .3;

    for (let i = 0; i < this.elements.length; ++i) {
      const element = this.elements[ i ];
      const y = this._computeValuePosition( element.value );

      if (y < topBorder || y > bottomBorder) {
        continue;
      }

      const animation = element.animation;
      const hasAnimation = !!animation;
      const isShowing = hasAnimation ? element.state === AxisElementState.showing : false;
      const opacity = hasAnimation
        ? (isShowing
            ? element.startOpacity + element.animationObject.opacity * element.opacityScale
            : element.animationObject.opacity * element.opacityScale
        )
        : element.opacity;

      if (reduceDrawings && opacity < opacityThreshold) {
        continue;
      }

      context.globalAlpha = textColorAlpha * opacity * ( this.isDoubleAxis ? line.opacity : 1 );
      context.fillText(element.formattedValue, x, y - 5);

      if (drawAxes) {
        context.globalAlpha = axesColorAlpha * opacity;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + axisWidth, y);
        context.stroke();
      }
    }
  }

  computeAxisValues () {
    const chart = this.chart;
    const isPercentage = this.chart.isPercentage;
    const viewportPixelY = this.chart.computeViewportPixelY( chart.localMinY, chart.localMaxY );
    const viewportMinY = chart.localMinY;
    const viewportMaxY = chart.localMaxY - (
      isPercentage
        ? 5
        : (this.chart.seriesOffsetTop + this.fontSize) * viewportPixelY
    );
    const distance = viewportMaxY - viewportMinY;

    if (!distance) {
      return [];
    }

    const valuesNumber = this.chart.isPercentage ? 4 : 5;
    let deltaY = distance / valuesNumber;

    let currentValue = viewportMinY;
    let result = [ currentValue ];

    for (let i = 0; i <= valuesNumber; ++i) {
      result.unshift( currentValue + deltaY );
      currentValue += deltaY;
    }

    return result;
  }

  /**
   * @param value
   * @param withoutAnimations
   * @return {{animation: Tween, state: number, opacity: number, value: *}}
   */
  initializeWrapper (value, withoutAnimations = false) {
    return {
      id: AUTOINCREMENT_ID++,
      value, //: this.roundValue( value ),
      formattedValue: this.formatNumber( value ),
      opacity: withoutAnimations ? 1 : 0,
      startOpacity: withoutAnimations ? 1 : 0,
      animation: null,
      animationId: null,
      state: AxisElementState.showing
    };
  }

  updateValues () {
    super.updateValues();
  }

  get textColor () {
    return this.chart.isBarChart || this.chart.isPercentage
      ? this.chart.telechart.themeColors.barAxisTextColorY
      : this.chart.telechart.themeColors.axisTextColor;
  }

  get textColorAlpha () {
    return this.chart.isBarChart || this.chart.isPercentage
      ? this.chart.telechart.themeColors.barAxisTextColorAlphaY
      : this.chart.telechart.themeColors.axisTextColorAlpha;
  }

  get textColorLeft () {
    const yScaled = this.chart.isYScaled;

    return yScaled
      ? this.chart.series[ 0 ].color
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
      ? this.chart.series[ 1 ].color
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
   * @param value
   * @return {number}
   * @private
   */
  roundValue (value) {
    return ~~( value + .5 );
  }

  /**
   * @param {number} value
   */
  formatNumber (value) {
    const v = Math.abs( ensureNumber( value ) );
    let symbol = '';

    const compressedValue = v >= 1.0e+9
      ? (symbol = 'B', v / 1.0e+9)
      : v >= 1.0e+6
        ? (symbol = 'M', v / 1.0e+6)
        : v >= 1.0e+3
          ? (symbol = 'K', v / 1.0e+3)
          : v;

    return 1 * ( compressedValue.toFixed( symbol ? 1 : 0 ) ) + symbol;
  }
}

