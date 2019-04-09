import sourceData1 from '../samples/1/overview.json';
import sourceData2 from '../samples/2/overview.json';
import sourceData3 from '../samples/3/overview.json';
import sourceData4 from '../samples/4/overview.json';
import sourceData5 from '../samples/5/overview.json';

import { TelechartApi } from '../src/core/api/TelechartApi';
import { ChartThemes } from '../src/utils/themes';

import {
  addClass, animationTimeout,
  ChartThemesColors,
  createElement, cssText,
  isBrowserSafari,
  parseQueryString,
  removeClass, setAttributes
} from '../src/utils';

const sources = [
  sourceData1,
  sourceData2,
  sourceData3,
  sourceData4,
  sourceData5
];

const apis = [];

const query = parseQueryString( location.search );
let currentThemeName = query && query.theme || 'default';

const source = sources[ 4 ];

createChart( source, 0 );

updatePageTheme();

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
  removeClass( document.body, [ 'default-theme', 'dark-theme' ] );
  addClass( document.body, `${currentThemeName}-theme` );

  if (isBrowserSafari()) {
    addClass( document.body, 'browser-safari' );
  }

  animationTimeout( 300 ).then(_ => {
    updatePageThemeColor();
  });
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
    title: 'Followers',
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
