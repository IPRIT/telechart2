import { EventEmitter } from '../misc/EventEmitter';
import {
  addClass, animationTimeout, createElement,
  cssText, hasClass, passiveIfSupported,
  removeClass, setAttributes
} from '../../utils';

let LABEL_BUTTONS_ID = 1;

const buttonClass = 'telechart2-label-button';
const creatingClass = 'telechart2-label-button_creating';
const selectedClass = 'telechart2-label-button_selected';
const shakingClass = 'telechart2-label-button_shaking';

export class LabelButtons extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  id = LABEL_BUTTONS_ID++;

  /**
   * @type {TelechartApi}
   * @private
   */
  api = null;

  /**
   * @type {Element}
   * @private
   */
  root = null;

  /**
   * @type {Element}
   */
  container = null;

  /**
   * @type {Array}
   */
  buttons = [];

  /**
   * @param {TelechartApi} api
   * @param {Element} root
   */
  constructor (api, root) {
    super();

    this.api = api;
    this.root = root;
  }

  initialize (buttons = []) {
    this.lines = buttons;

    this._createContainer();
    this._createButtons();
  }

  updateButtons (newLines = []) {
    const map = Object.create( null );
    for (let i = 0; i < newLines.length; ++i) {
      map[ newLines[ i ].label ] = newLines[ i ];
    }

    for (let i = 0; i < this.lines.length; ++i) {
      const line = this.lines[ i ];
      const newLine = map[ line.label ];

      this._setButtonVisibility( line, newLine.visible );
    }
  }


  /**
   * @private
   */
  _createContainer () {
    const parent = this.root;

    const container = createElement('div', {
      attrs: {
        class: 'telechart2-label-buttons',
        style: cssText({
          opacity: 0
        })
      }
    });

    parent.appendChild( container );

    this.container = container;
  }

  /**
   * @private
   */
  _createButtons () {
    this.lines.forEach((line, index) => {
      this.container.appendChild(
        this._createButton( line, index )
      )
    });
  }

  /**
   * @param line
   * @return {Element}
   * @private
   */
  _createButton (line, index) {

    const buttonIcon = this._createSvgIcon( line.color );

    const buttonText = createElement('div', {
      attrs: {
        class: `${buttonClass}__text`
      }
    }, line.name);

    const button = createElement('button', {
      attrs: {
        class: `${buttonClass} ${selectedClass} ${creatingClass}`,
        id: `telechart2-button-label-${line.label}`,
        style: cssText({
          backgroundColor: line.color,
          transitionDelay: `${index * 10}ms`
        })
      }
    }, [ buttonIcon, buttonText ]);

    animationTimeout( 100 ).then(_ => {
      removeClass( button, creatingClass );
    });

    button.addEventListener('click', _ => this._onButtonClick( button, line ));

    let longTapTimeout = null;
    let longTapped = false;

    button.addEventListener('touchstart', ev => {
      if (ev.cancelable) {
        ev.preventDefault();
      }
      longTapped = false;
      longTapTimeout = setTimeout(_ => {
        longTapped = true;
        this._onLongTapped( button, line );
      }, 800);
    }, passiveIfSupported( false ));

    const cancelLongTap = ev => {
      if (longTapTimeout) {
        clearTimeout( longTapTimeout );
        longTapTimeout = null;
      }
    };

    button.addEventListener('touchend', ev => {
      if (!longTapped) {
        this._onButtonClick( button, line )
      }

      cancelLongTap( ev );
    });

    return button;
  }

  /**
   * @param {string} color
   * @return {Element}
   * @private
   */
  _createSvgIcon (color) {
    const iconSize = 22;

    const pathText = 'M0.9,4.2 3.6,7 9.6,0.9';

    const path = createElement('path', {
      useNS: true,
      attrs: {
        d: pathText,
        stroke: 'white',
        fill: 'none',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeMiterlimit: 10,
        transform: `translate(6, 7)`
      }
    }, [], 'http://www.w3.org/2000/svg');

    return createElement('svg', {
      useNS: false,
      attrs: {
        xmlns: 'http://www.w3.org/2000/svg',
        version: '1.1',
        width: iconSize,
        height: iconSize,
        viewBox: [ 0, 0, iconSize, iconSize ].join( ' ' ),
        class: 'telechart2-label-button__icon'
      }
    }, [ path ], 'http://www.w3.org/2000/svg');
  }

  /**
   * @param button
   * @param line
   * @return {Promise<void | never>}
   * @private
   */
  _onButtonClick (button, line) {
    const visible = this.lines.filter( line => line.visible );
    const isSingleVisible = visible.length <= 1;
    const isOwn = visible[ 0 ] && visible[ 0 ].label === line.label;

    if (isSingleVisible && isOwn) {
      if (hasClass( button, shakingClass )) {
        return;
      }
      return animationTimeout( 10 ).then(_ => {
        addClass( button, shakingClass );
        return animationTimeout( 500 );
      }).then(_ => {
        removeClass( button, shakingClass );
      });
    }

    this.api.toggleSeries( line.label );

    this._setButtonVisibility( line, !hasClass( button, selectedClass ), button );
  }

  /**
   * @param button
   * @param line
   * @private
   */
  _onLongTapped (button, line) {
    this.api.toggleSeries( line.label, true );

    if (navigator && navigator.vibrate) {
      navigator.vibrate([ 17 ]);
    }
  }

  /**
   * @param line
   * @param visibility
   * @param button
   * @private
   */
  _setButtonVisibility (line, visibility, button = null) {
    button = button || this.container.querySelector( `#telechart2-button-label-${line.label}` );

    line.visible = visibility;

    if (visibility) {
      addClass( button, selectedClass );
      setAttributes(button, {
        style: cssText({
          backgroundColor: line.color
        })
      });
    } else {
      removeClass( button, selectedClass );
      setAttributes(button, {
        style: cssText({
          color: line.color,
          borderColor: line.color
        })
      });
    }
  }
}
