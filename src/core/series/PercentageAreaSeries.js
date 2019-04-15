import { Series } from './Series';
import { SeriesTypes } from './SeriesTypes';

export class PercentageAreaSeries extends Series {

  initialize () {
    super.initialize();

    this.setType( SeriesTypes.area );
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Array<number>} interval
   * @param {number} step
   * @param input
   */
  drawByInterval (context, interval, step = 1, input) {
    return this.drawAreasToContext( context, interval, step, input );
  }

  /**
   * @param context
   * @param interval
   * @param step
   * @param input
   * @param settings
   * @private
   */
  drawAreasToContext (context, interval, step = 1, input = [], settings = {}) {
    const chartOffsetTop = this.chart.seriesOffsetTop + ( this.chart.isMainChart ? 14 : 0 );
    const chartHeight = this.chart.chartHeight - ( this.chart.isMainChart ? 14 : 0 );

    const {
      viewportRange = this.chart.viewportRange,
      viewportPixelX = this.chart.viewportPixelX,
      viewportPixelY = 100 / chartHeight,
      currentLocalMinY = 0
    } = settings || {};

    const [ startIndex, endIndex ] = interval;
    const [ minViewportX ] = viewportRange;

    const chartBottomLineY = chartOffsetTop + chartHeight;

    const dxOffset = minViewportX / viewportPixelX;
    const dyOffset = currentLocalMinY / viewportPixelY + chartBottomLineY;

    const scale = this.opacity;
    const stackedSumTree = this.chart.stackedSumTree;
    const sumTreeOffset = this.chart.computeSumTreeChunkOffset();
    const useAdditionalSums = this.chart.areaAdditionalSumsNeeded;
    const additionalSums = this.chart.areaAdditionalSums;

    context.globalAlpha = 1;
    context.fillStyle = this.color;
    context.beginPath();

    for (let i = startIndex, inputIndex = 0; i <= endIndex; i += step, ++inputIndex) {
      // set if undefined
      input[ inputIndex ] = input[ inputIndex ] || 0;

      const startY = input[ inputIndex ]; // prev percents
      let sum = stackedSumTree[ sumTreeOffset + i ] + (
        useAdditionalSums
          ? additionalSums[ i ]
          : 0
      );
      const curY = this.yAxis[ i ]; // current Y value
      const heightY = curY / sum * 100 * scale; // current percents Y / SUM * animationScale

      input[ inputIndex ] += heightY;

      let x = this.xAxis[ i ] / viewportPixelX - dxOffset;
      let y = dyOffset - startY / viewportPixelY;

      if (i === startIndex) {
        context.moveTo( x, y );
      } else {
        context.lineTo( x, y );
      }

      if (i === endIndex) {
        context.lineTo( x, chartOffsetTop );
        context.lineTo( this.xAxis[ startIndex ] / viewportPixelX - dxOffset, chartOffsetTop );
      }
    }

    context.closePath();
    context.fill();

    return input;
  }
}
