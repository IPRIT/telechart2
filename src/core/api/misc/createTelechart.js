import { Telechart2 } from '../../../Telechart2';

/**
 * @param env
 * @return {Telechart2}
 */
export function createTelechart (env) {
  const {
    canvas,
    settings: {
      options,
      environmentOptions
    }
  } = env;

  return Telechart2.create( canvas, options, environmentOptions );
}
