import { Series } from './Series';
import { SeriesTypes } from './SeriesTypes';

export class BarSeries extends Series {

  initialize () {
    super.initialize();

    this.setType( SeriesTypes.bar );
  }

  draw (context) {
    this.drawBars( context );
  }

  drawBars (context) {
    if (!this.opacity) {
      return;
    }

    const interval = this.chart._viewportPointsIndexes;

    if (!interval.length
      || interval[ 1 ] - interval[ 0 ] <= 0) {
      return;
    }

    this.drawBarsByInterval( context, interval, this.chart.viewportPointsStep );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   * @param {number} step
   */
  drawBarsByInterval (context, interval, step = 1) {
    // console.log( 'drawing bars' );
  }

  /**
   * @param context
   * @param interval
   * @param step
   * @param settings
   * @private
   */
  drawBarsToContext (context, interval, step = 1, settings = {}) {
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
    const dyOffset = currentLocalMinY / viewportPixelY;

    const x = this.xAxis[ startIndex ] / viewportPixelX - dxOffset;
    const y = chartBottomLineY - ( this.yAxis[ startIndex ] / viewportPixelY - dyOffset );

    for (let i = startIndex + 1; i <= endIndex; i += step) {
    }
  }
}
