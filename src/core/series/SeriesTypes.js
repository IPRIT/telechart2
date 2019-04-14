import { Series } from './Series';
import { BarSeries } from './BarSeries';

export const SeriesTypes = {
  x: 'x',
  line: 'line',
  bar: 'bar',
  area: 'area',
};

export const SeriesTypeMapping = {
  [SeriesTypes.line]: Series,
  [SeriesTypes.bar]: BarSeries,
};
