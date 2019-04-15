import { Series } from './Series';
import { BarSeries } from './BarSeries';
import { PercentageAreaSeries } from './PercentageAreaSeries';

export const SeriesTypes = {
  x: 'x',
  line: 'line',
  bar: 'bar',
  area: 'area',
};

export const SeriesTypeMapping = {
  [SeriesTypes.line]: Series,
  [SeriesTypes.bar]: BarSeries,
  [SeriesTypes.area]: PercentageAreaSeries,
};
