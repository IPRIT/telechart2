import { Series } from './Series';
import { SeriesTypes } from './SeriesTypes';

export class BarSeries extends Series {

  initialize () {
    super.initialize();

    this.setType( SeriesTypes.bar );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   * @param {number} step
   * @param input
   */
  drawByInterval (context, interval, step = 1, input) {
    return this.drawBarsToContext( context, interval, step, input );
  }

  /**
   * @param context
   * @param interval
   * @param step
   * @param input
   * @param settings
   * @private
   */
  drawBarsToContext (context, interval, step = 1, input = [], settings = {}) {
    const {
      viewportRange = this.chart.viewportRange,
      viewportPixelX = this.chart.viewportPixelX,
      viewportPixelY = this.chart.viewportPixelY,
      currentLocalMinY = this.chart.currentLocalMinY
    } = settings || {};

    const [ startIndex, endIndex ] = interval;
    const [ minViewportX ] = viewportRange;

    const chartHeight = this.chart.chartHeight;
    const chartOffsetTop = this.chart.seriesOffsetTop;
    const chartBottomLineY = chartOffsetTop + chartHeight;

    const dxOffset = minViewportX / viewportPixelX;
    const dyOffset = currentLocalMinY / viewportPixelY + chartBottomLineY;

    const barScale = this.opacity;
    let barWidthX = this.xAxis[ startIndex + step ] - this.xAxis[ startIndex ];

    if (!barWidthX) {
      barWidthX = this.xAxis[ startIndex ] - this.xAxis[ startIndex - step ];
    }

    const barHalfWidthX = barWidthX * .5;

    context.fillStyle = this.color;

    for (let i = startIndex, inputIndex = 0; i <= endIndex; i += step, ++inputIndex) {
      // set if undefined
      input[ inputIndex ] = input[ inputIndex ] || 0;

      const startY = input[ inputIndex ];
      const barHeightY = this.yAxis[ i ] * barScale;
      input[ inputIndex ] += barHeightY;

      let x = ( this.xAxis[ i ] - barHalfWidthX ) / viewportPixelX - dxOffset - .5;
      let y = dyOffset - ( startY + barHeightY ) / viewportPixelY - .5;
      let width = barWidthX / viewportPixelX + 1;
      let height = barHeightY / viewportPixelY + 1;

      context.fillRect( x, y, width, height );
    }

    context.fill();

    return input;
  }
}
