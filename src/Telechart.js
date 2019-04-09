import './style/telechart.scss';

import { AnimationSource, AnimationSourceEvents } from './core/animation/AnimationSource';
import { SvgRenderer } from "./core/SvgRenderer";
import { Chart } from './core/chart/Chart';
import { Clock } from './core/misc/Clock';
import { NavigatorChart } from './core/chart/NavigatorChart';
import { ChartEvents } from './core/chart/events/ChartEvents';
import { NavigatorChartEvents } from './core/chart/events/NavigatorChartEvents';
import { LabelButtons } from './core/chart/LabelButtons';

import {
  addClass,
  interpolateThemeClass,
  removeClass,
  resolveElement,
  ChartThemes,
  setAttributesNS,
  cssText, createElement, ROOT_CLASS_NAME, getWindowHeight, getDocumentScrollTop, getElementOffset, getElementHeight
} from "./utils";

let TELECHART_ID = 1;

export class Telechart {

  /**
   * @type {number}
   * @private
   */
  _id = TELECHART_ID++;

  /**
   * @type {Object}
   * @private
   */
  _options = null;

  /**
   * @type {Element}
   * @private
   */
  _rootElement = null;

  /**
   * @type {SvgRenderer}
   * @private
   */
  _renderer = null;

  /**
   * @type {Chart}
   * @private
   */
  _chart = null;

  /**
   * @type {NavigatorChart}
   * @private
   */
  _navigatorChart = null;

  /**
   * @type {LabelButtons}
   * @private
   */
  _labelButtons = null;

  /**
   * @type {string}
   * @private
   */
  _themeName = ChartThemes.default;

  /**
   * @type {string}
   * @private
   */
  _title = '';

  /**
   * @type {SVGTextElement}
   * @private
   */
  _titleElement = null;

  /**
   * @type {Clock}
   * @private
   */
  _clock = null;

  /**
   * @type {AnimationSource}
   * @private
   */
  _animationSource = null;

  /**
   * @static
   * @param {Element | string} mountTo Element or selector
   * @param {Object} options
   */
  static create (mountTo, options = {}) {
    const chart = new Telechart();

    chart.setOptions( options );
    chart.mount( resolveElement( mountTo ) );
    chart.initialize();

    chart.firstRender();

    return chart;
  }

  /**
   * @param {Object} options
   */
  setOptions (options = {}) {
    this._options = options;
  }

  /**
   * @param {Element} parent
   */
  mount (parent) {
    const root = createElement('div', {
      attrs: {
        class: ROOT_CLASS_NAME
      }
    });

    parent.appendChild( root );

    this._rootElement = root;
    this._renderer = new SvgRenderer( root );
  }

  /**
   * Initialize the chart
   */
  initialize () {
    this.setTheme( this._options.theme || ChartThemes.default );
    this.setTitle( this._options.title );

    // create components
    this._createChart();
    this._createNavigatorChart();
    this._createLabelButtons();
    this._addEventsListeners();

    // create animation loop
    this._clock = new Clock();
    this._animationSource = new AnimationSource( 60, 1 ); // fps, timeScale
    this._animationSource.on(AnimationSourceEvents.UPDATE, deltaTime => {
      this.update( deltaTime );
    });

    requestAnimationFrame(_ => {
      this.animate();
    });
  }

  /**
   * Draws first frame
   */
  firstRender () {
    this._chart.firstRender();
    this._navigatorChart.firstRender();
  }

  /**
   * Animation loop
   */
  animate () {
    const deltaTime = this._clock.getDelta();
    this._animationSource.update( deltaTime );

    requestAnimationFrame(_ => this.animate());
  }

  /**
   * Update loop
   */
  update (deltaTime) {
    this._chart.update( deltaTime );
    this._navigatorChart.update( deltaTime );
  }

  /**
   * @param {string} themeName
   */
  setTheme (themeName) {
    const rootElement = this._rootElement;

    removeClass(
      rootElement,
      Object.keys( ChartThemes )
        .map( interpolateThemeClass )
    );

    addClass(
      rootElement,
      interpolateThemeClass( themeName )
    );

    this._themeName = themeName;
  }

  /**
   * @param {string} title
   */
  setTitle (title) {
    this._title = title;

    !this._titleElement
      ? this._createTitle( title )
      : this._updateTitle( title );
  }

  /**
   * Destroys the chart instance
   */
  destroy () {
    this._renderer && this._renderer.destroy();
    this._rootElement = null;
    this._renderer = null;
  }

  /*/!**
   * @return {boolean}
   *!/
  get inWindowViewport () {
    const windowHeight = getWindowHeight();
    const windowTopLine = getDocumentScrollTop();
    const windowBottomLine = windowHeight + windowTopLine;

    const { top: chartTopLine } = getElementOffset( this._renderer.parentContainer );
    const chartHeight = getElementHeight( this._renderer.parentContainer );
    const chartBottomLine = chartTopLine + chartHeight;

    return windowTopLine < chartTopLine
      && windowBottomLine > chartTopLine
      || windowTopLine < chartBottomLine
      && windowBottomLine > chartBottomLine;
  }*/

  /**
   * @return {string}
   */
  get themeName () {
    return this._themeName;
  }

  /**
   * @param {string} title
   * @private
   */
  _createTitle (title = this._options.title) {
    if (!title) {
      return;
    }

    const text = this._renderer.createText(title, {
      class: 'telechart-title',
      x: 16,
      y: 36,
      textAnchor: 'start',
      style: cssText({
        opacity: 0
      })
    });

    setTimeout(_ => {
      setAttributesNS(text, {
        style: cssText({
          opacity: 1
        })
      });
    }, 200);

    this._titleElement = text;
  }

  /**
   * @param {string} title
   * @private
   */
  _updateTitle (title) {
    if (!this._titleElement) {
      return;
    }
    const tspan = this._titleElement.querySelector( 'tspan' );
    tspan.textContent = title;
  }

  /**
   * @private
   */
  _createChart () {
    this._chart = new Chart(
      this._renderer,
      this._options
    );

    this._chart.initialize();
  }

  /**
   * @private
   */
  _createNavigatorChart () {
    this._navigatorChart = new NavigatorChart(
      this._renderer,
      this._options
    );

    this._navigatorChart.initialize();
  }

  /**
   * @private
   */
  _createLabelButtons () {
    const labelButtons = new LabelButtons( this._renderer );
    labelButtons.setChart( this._chart );
    labelButtons.initialize();

    this._labelButtons = labelButtons;
  }

  /**
   * @private
   */
  _addEventsListeners () {
    this._chart.on(ChartEvents.SERIES_VISIBLE_CHANGE, line => {
      this._navigatorChart.toggleSeries( line.label );
    });

    this._navigatorChart.on(NavigatorChartEvents.RANGE_CHANGED, range => {
      this._chart.setNavigationRange( ...range );
    });

    this._navigatorChart.on(NavigatorChartEvents.ANIMATE_RANGE, range => {
      this._chart.animateNavigationRangeTo( ...range );
    });
  }
}
