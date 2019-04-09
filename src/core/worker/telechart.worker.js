import { EventEmitter } from '../misc/EventEmitter';
import { createTelechart } from '../api/misc/createTelechart';
import { TelechartWorkerEvents } from './worker-events';

const eventBus = new EventEmitter();

/**
 * @type {Telechart2}
 */
let telechart = null;

self.addEventListener('message', ev => {
  const type = ev.data.type || 'message';

  eventBus.emit( type, ev );
});

eventBus.on(TelechartWorkerEvents.SETUP, ev => {
  const env = ev.data;

  telechart = createTelechart( env );
  console.log( telechart );
});

eventBus.on(TelechartWorkerEvents.UPDATE_ENVIRONMENT, ev => {
  const { environmentOptions } = ev.data;

  if (!environmentOptions) {
    return;
  }

  telechart.setEnvironmentOptions( environmentOptions );
});

eventBus.on(TelechartWorkerEvents.SET_THEME, ev => {
  let { themeName } = ev.data;

  telechart.setTheme( themeName );
});
