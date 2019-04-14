import { AxisElementState } from './ChartAxis';
import { ChartAxisY } from './ChartAxisY';

export class ChartAxisY2 extends ChartAxisY {

  redraw () {
    const context = this.chart.telechart.axisContext;

    const firstLine = this.chart.series[ 0 ];
    const drawAxes = !this.isDoubleAxis || !firstLine.isVisible;

    this.drawRight( context, drawAxes );
  }

  drawRight (context, drawAxes = false) {
    const line = this.chart.series[ 1 ];

    if (line.opacity <= 0) {
      return;
    }

    const textColor = this.textColorRight;
    const textColorAlpha = this.textColorRightAlpha;
    const axesColor = this.axesColor;
    const axesColorAlpha = this.axesColorAlpha;

    const fontSize = this.fontSize;

    // values
    context.font = `${fontSize}px Arial`;
    context.fillStyle = textColor;
    context.textAlign = "right";

    // axes
    context.strokeStyle = axesColor;
    context.lineWidth = 1;

    const x = this.chart.chartWidth - this.chart.viewportPadding;
    const axisWidth = this.chart.chartWidth - this.chart.viewportPadding * 2;

    const topBorder = 0;
    const bottomBorder = this.chart.chartHeight + this.chart.seriesOffsetTop + this.chart.seriesOffsetBottom;

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

      context.globalAlpha = textColorAlpha * opacity * ( this.isDoubleAxis ? line.opacity : 1 );
      context.fillText(element.formattedValue, x, y - 5);

      if (drawAxes) {
        context.globalAlpha = axesColorAlpha * opacity;
        context.beginPath();
        context.moveTo( this.chart.viewportPadding, y);
        context.lineTo( this.chart.viewportPadding + axisWidth, y);
        context.stroke();
      }
    }
  }

  computeAxisValues () {
    const chart = this.chart;
    const viewportPixelY2 = this.chart.computeViewportPixelY2( chart.localMinY2, chart.localMaxY2 );
    const viewportMinY2 = chart.localMinY2;
    const viewportMaxY2 = chart.localMaxY2 - (this.chart.seriesOffsetTop + this.fontSize) * viewportPixelY2;
    const distance = viewportMaxY2 - viewportMinY2;

    if (!distance) {
      return [];
    }

    let deltaY = distance / 5;

    let currentValue = viewportMinY2;
    let result = [ currentValue ];

    for (let i = 0; i < 6; ++i) {
      result.unshift( currentValue + deltaY );
      currentValue += deltaY;
    }

    return result;
  }

  /**
   * @param value
   * @return {number}
   * @private
   */
  _computeValuePosition (value) {
    return this.chart.projectYToCanvas2( value );
  }
}

