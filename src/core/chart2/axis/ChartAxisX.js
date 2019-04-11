import { AxisElementState, ChartAxis } from './ChartAxis';
import { setAttributeNS, zeroFill } from '../../../utils';

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
  interval = null;

  redraw () {
    const context = this.chart.telechart.axisContext;

    const y = this.chart.chartHeight + this.chart.seriesOffsetTop + 1;

    context.clearRect( 0, y, this.chart.chartWidth, this.chart.seriesOffsetBottom );

    this.draw( context );
  }

  draw (context) {
    const textColor = this.textColor;
    const textColorAlpha = this.textColorAlpha;

    const fontSize = this.fontSize;

    // values
    context.font = `${fontSize}px Arial`;
    context.fillStyle = textColor;
    context.textAlign = "center";

    const y = this.chart.chartHeight + this.chart.seriesOffsetTop + this.fontSize + 4;

    for (let i = 0; i < this.elements.length; ++i) {
      const element = this.elements[ i ];
      const x = this._computeValuePosition( this.axesValuesMapping[ element.value ] );

      context.globalAlpha = textColorAlpha * element.opacity;
      context.fillText(element.formattedValue, x, y);
    }
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

    if (this.interval == null) {
      this.interval = pixelX * chartWidth / maxAvailableLabels;
    }

    const intervalInPixels = this.interval / pixelX;
    if (intervalInPixels < minLabelWidth) {
      this.interval *= 2;
    } else if (intervalInPixels > minLabelWidth * 2) {
      this.interval *= .5;
    }

    let currentValue = viewportMaxX - pixelX * minLabelWidth / 2;

    if (this.axesValues.length > 0) {
      let foundByPrev = false;

      for (let i = this.axesValues.length - 1; i >= 0; --i) {
        const currentLastValue = this.axesValuesMapping[ this.axesValues[ i ] ];
        const prevValue = currentLastValue - this.interval;
        const nextValue = currentLastValue + this.interval;

        if (viewportMaxX > prevValue && viewportMaxX < nextValue) {
          currentValue = currentLastValue;
          foundByPrev = true;
          break;
        }
      }

      const currentLastValue = this.axesValuesMapping[ this.axesValues[ this.axesValues.length - 1 ] ];

      if (!foundByPrev && ( currentLastValue + this.interval * 2 >= viewportMaxX )) {
        currentValue = currentLastValue + this.interval;
      }
    }

    let result = [];

    while (currentValue >= viewportMinX) {
      result.unshift( currentValue );
      currentValue -= this.interval;
    }

    return result;
  }

  /**
   * @param value
   * @param {boolean} initial
   * @return {{animation: Tween, state: number, opacity: number, value: *}}
   */
  initializeWrapper (value, initial = false) {
    let formattedValue = this._toDateString( value );
    const parts = formattedValue.split( ' ' );
    formattedValue = [ parts[0], parts[1] ].join( ' ' );

    return {
      value,
      formattedValue,
      opacity: 0,
      animation: null,
      state: AxisElementState.showing
    };
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
   * @return {number}
   * @private
   */
  _computeValuePosition (value) {
    return this.chart.projectXToCanvas( value );
  }

  /**
   * @param {number} value
   * @param {boolean} withHours
   * @return {string}
   * @private
   */
  _toDateString (value, withHours = false) {
    const date = new Date( value );
    const datePart = date.toUTCString().split( ' ' );

    const base = `${datePart[ 2 ]} ${datePart[ 1 ]} ${date.getFullYear()}`;

    if (withHours) {
      return `${zeroFill(date.getHours())}:${zeroFill(date.getMinutes())} ` + base;
    }

    return base;
  }
}

