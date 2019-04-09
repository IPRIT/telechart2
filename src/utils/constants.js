const hour = 3600 * 1000;

/**
 * @type {{second: number, minute: number, hour: number, day: number, week: number, month: number, year: number}}
 */
export const TimeRanges = {
  second: 1000,
  minute: hour / 60,
  hour,
  day: hour * 24,
  week: hour * 24 * 7,
  month: hour * 24 * 30, // rude
  year: hour * 24 * 365
};

export const ChartVariables = {
  enableOffscreenCanvas: true,

  maxHeight: 440,
  minWidth: 100,
  chartHeight: 290,
  seriesTop: 65,

  chartPaddingLeftRight: 12,

  // navigation chart
  navigationChartHeight: 40,
  navigationChartOffsetY: 388
};
