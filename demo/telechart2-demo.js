import '../src/style/telechart.scss';

import { Clock } from '../src/core/misc/Clock';
import { TelechartApi } from '../src/core/api/TelechartApi';
import { ChartThemes } from '../src/utils/themes';

import {
  addClass, animationTimeout,
  ChartThemesColors, ChartVariables,
  createElement, cssText,
  isBrowserSafari, isOffscreenCanvasSupported,
  parseQueryString,
  removeClass, setAttributes
} from '../src/utils';

import sourceData1 from '../samples/1/overview.json';
import sourceData2 from '../samples/2/overview.json';
import sourceData3 from '../samples/3/overview.json';
import sourceData4 from '../samples/4/overview.json';
import sourceData5 from '../samples/5/overview.json';

const sources = [
  sourceData1,
  sourceData2,
  sourceData3,
  sourceData4,
  sourceData5
];

const titles = [ 'Followers', 'Interactions', 'Messages', 'Views', 'Apps' ];

const apis = [];

const query = parseQueryString( location.search );
let currentThemeName = query && query.theme || 'default';

if (query && typeof query.oc !== 'undefined') {
  window.t2_foc = query.oc === 'true';
}

if (isOffscreenCanvasSupported()) {
  const hasForceOffscreenState = typeof window.t2_foc !== 'undefined';
  const forceOffscreenState = hasForceOffscreenState ? t2_foc : null;
  const isOffscreenCanvas = (
    forceOffscreenState !== null
      ? forceOffscreenState
      : ChartVariables.enableOffscreenCanvas
  ) && isOffscreenCanvasSupported();

  const demoSettings = document.querySelector( '.demo-settings' );
  if (isOffscreenCanvas) {
    demoSettings.innerHTML = `<a href="?oc=false">Disable workers</a> and draw charts in the main thread.`;
  } else {
    demoSettings.innerHTML = `Your browser supports OffscreenCanvas & WebWorker technologies.<br>
    You can <a href="?oc=true">enable</a> drawing in multiple threads with backward compatibility support.`;
  }
}

let fromIndex = 0;
let toIndex = sources.length;

for (let i = fromIndex; i < toIndex; ++i) {
  const source = sources[ i ];
  createChart( source, i );
}

startAnimating();

updatePageTheme();

window.addEventListener('load', ev => {
  animationTimeout().then(_ => {
    removeClass( document.body, 'not-ready' );
  });
});

let buttonContent = `
  <span class="text-switcher">
    <span>Switch to </span>
    <span class="text-switcher__switcher">
      <span>Night</span>
      <span>Day</span>
    </span>
    <span> Mode</span>
  </span>
`;

const themeButton = createElement('button', {
  attrs: {
    class: 'demo-theme-button',
    style: cssText({
      opacity: 0
    })
  }
}, buttonContent);

window.addEventListener('load', _ => {
  document.body.appendChild( themeButton );

  themeButton.addEventListener('click', ev => {
    updateChartsTheme();
    updatePageTheme();
  });

  animationTimeout( 100 ).then(_ => {
    setAttributes(themeButton, {
      style: cssText({
        opacity: 1
      })
    });
  });
});

function updateChartsTheme () {
  const isDefaultTheme = currentThemeName === ChartThemes.default;
  const newTheme = isDefaultTheme
    ? ChartThemes.dark
    : ChartThemes.default;

  currentThemeName = newTheme;

  apis.forEach(api => {
    api.setTheme( newTheme );
  });
}

function updatePageTheme () {
  animationTimeout().then(_ => {
    removeClass( document.body, [ 'default-theme', 'dark-theme' ] );
    addClass( document.body, `${currentThemeName}-theme` );

    if (isBrowserSafari()) {
      addClass( document.body, 'browser-safari' );
    }

    animationTimeout( 300 ).then(_ => {
      updatePageThemeColor();
    });
  })
}

function updatePageThemeColor () {
  const themeColor = ChartThemesColors[ currentThemeName ];

  let metaTheme = document.querySelector( '[name="theme-color"]' );

  if (!metaTheme) {
    metaTheme = createElement('meta', {
      attrs: {
        name: 'theme-color',
        content: themeColor
      }
    });
    document.head.appendChild( metaTheme );
  } else {
    metaTheme.setAttribute( 'content', themeColor );
  }
}

/**
 * @param sourceData
 * @param index
 */
function createChart (sourceData, index) {
  const container = document.querySelector( `#telechart-${index + 1}` );

  const start = performance.now();

  const api = new TelechartApi();
  api.createChart(container, {
    title: titles[ index ],
    series: sourceData,
    seriesOptions: {
      grouping: {
        pixels: 3
      }
    }
  });
  api.initialize();

  console.log( `#${index}`, performance.now() - start, api );

  apis.push( api );
}


function startAnimating () {
  window.myClock = new Clock();
  animate();
}

function animate () {
  let deltaMs = window.myClock.getDelta();

  for (let i = 0, len = apis.length; i < len; ++i) {
    apis[ i ].tick( deltaMs );
  }

  requestAnimationFrame( animate );
}
