import { EventEmitter } from '../misc/EventEmitter';
// import { SvgRenderer } from '../SvgRenderer';
import {
  addClass, createElement,
  cssText, hasClass,
  removeClass, attachRipple
} from '../../utils';

let LABEL_BUTTONS_ID = 1;

export class LabelButtons extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = LABEL_BUTTONS_ID++;

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
   * @type {Element}
   * @private
   */
  _container = null;

  /**
   * @param {SvgRenderer} renderer
   */
  constructor (renderer) {
    super();

    this._renderer = renderer;
  }

  /**
   * @param {Chart | BaseChart} chart
   */
  setChart (chart) {
    this._chart = chart;
  }

  initialize () {
    this._createContainer();
    this._createButtons();
  }

  /**
   * @param {*} deltaTime
   */
  update (deltaTime) {
  }

  /**
   * @private
   */
  _createContainer () {
    const parent = this._renderer.parentContainer;
    const container = createElement('div', {
      attrs: {
        class: 'telechart-label-buttons',
        style: cssText({
          opacity: 0
        })
      }
    });

    parent.appendChild( container );

    this._container = container;
  }

  /**
   * @private
   */
  _createButtons () {
    this._chart.eachSeries(line => {
      this._container.appendChild(
        this._createButton( line )
      )
    });
  }

  /**
   * @param line
   * @return {Element}
   * @private
   */
  _createButton (line) {
    const buttonIcon = this._createSvgIcon( line );

    const buttonText = createElement('div', {
      attrs: {
        class: 'telechart-label-button__text'
      }
    }, line.name);

    const button = createElement('button', {
      attrs: {
        class: 'telechart-label-button'
      }
    }, [ buttonIcon, buttonText ]);

    attachRipple( button );

    button.addEventListener('click', _ => {
      line.toggleVisible();

      const selectedClass = 'telechart-label-button_selected';
      const animatingClass = 'telechart-label-button_animating';

      const hasSelectedClass = hasClass( button, selectedClass );

      if (hasSelectedClass) {
        addClass( button, animatingClass );
      } else {
        removeClass( button, animatingClass );
      }

      setTimeout(_ => {
        if (hasSelectedClass) {
          removeClass( button, selectedClass );
        } else {
          addClass( button, selectedClass );
        }
        setTimeout(_ => {
          removeClass( button, animatingClass );
        }, 100);
      }, 10);
    });

    return button;
  }

  /**
   * @param line
   * @return {Element}
   * @private
   */
  _createSvgIcon (line) {
    const iconSize = 22;

    const pathText = 'M0.9,4.2 3.6,7 9.6,0.9';

    const svgContainer = createElement('svg', {
      useNS: false,
      attrs: {
        xmlns: SvgRenderer.NS,
        version: '1.1',
        width: iconSize,
        height: iconSize,
        viewBox: [ 0, 0, iconSize, iconSize ].join( ' ' ),
        class: 'telechart-label-button__icon',
        style: cssText({
          color: line.color,
          fill: line.color,
          stroke: line.color
        })
      }
    }, [], SvgRenderer.NS);

    const group = this._renderer.createGroup({}, [], svgContainer);

    this._renderer.createCircle(iconSize / 2, iconSize / 2, iconSize / 2, {
      fill: line.color,
    }, group);

    this._renderer.createPath(pathText, {
      stroke: '#fff',
      fill: 'none',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeMiterlimit: 10,
      transform: `translate(6, 7)`
    }, group);

    this._renderer.createCircle(iconSize / 2, iconSize / 2, 0, {
      fill: 'white',
      class: 'telechart-label-button__icon-mask'
    }, group);

    return svgContainer;
  }
}
