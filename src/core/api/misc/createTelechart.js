import { Telechart2 } from '../../../Telechart2';

/**
 * @param env
 * @return {Telechart2}
 */
export function createTelechart (env) {
  const {
    mainCanvas,
    navigationSeriesCanvas,
    navigationUICanvas,
    settings: {
      options,
      environmentOptions
    }
  } = env;

  return Telechart2.create({
    mainCanvas,
    navigationSeriesCanvas,
    navigationUICanvas
  }, options, environmentOptions );
}
