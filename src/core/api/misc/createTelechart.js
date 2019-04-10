import { Telechart2 } from '../../../Telechart2';

/**
 * @param env
 * @return {Telechart2}
 */
export function createTelechart (env) {
  const {
    mainCanvas,
    axisCanvas,
    navigationSeriesCanvas,
    navigationUICanvas,
    api = null,
    settings: {
      options,
      environmentOptions
    }
  } = env;

  return Telechart2.create({
    mainCanvas,
    axisCanvas,
    navigationSeriesCanvas,
    navigationUICanvas,
    api
  }, options, environmentOptions );
}
