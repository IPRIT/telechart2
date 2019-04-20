export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

const chartPaddingTop = 15;
const chartPaddingBottom = 32;

export const ChartVariables = {
  enableOffscreenCanvas: false,

  minWidth: 100,

  mainMaxHeight: 290 + chartPaddingTop + chartPaddingBottom,
  mainChartHeight: 290,
  mainChartOffsetTop: chartPaddingTop,
  mainChartOffsetBottom: chartPaddingBottom,

  chartPaddingLeftRight: 12,

  // navigation chart
  navigationChartHeight: 40,
  navigationChartUIHeight: 44,
  navigationChartOffsetY: 388,

  initialViewportScale: .25
};

export const DprSampling = {
  main: 2,
  axis: 1.8,
  ui: 1.25,
  navSeries: 2.3,
  navUI: 1
};
