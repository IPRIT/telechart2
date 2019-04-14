import { EventEmitter } from '../misc/EventEmitter';
import {
  addClass, animationTimeout,
  createElement,
  cssText, ensureNumber,
  getElementHeight,
  getElementWidth, isTouchEventsSupported, isTransformSupported,
  removeClass,
  setAttributes
} from '../../utils';

let LABEL_ID = 1;

export class DataLabel extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = LABEL_ID++;

  /**
   * @type {Element}
   */
  root = null;

  /**
   * @type {Element}
   * @private
   */
  container = null;

  /**
   * @type {{translateY: number, translateX: number}}
   * @private
   */
  containerPosition = {
    translateX: 0,
    translateY: 0
  };

  containerDirection = 'right';

  /**
   * @type {Element}
   * @private
   */
  dateElement = null;

  /**
   * @type {Element}
   * @private
   */
  tableElement = null;

  /**
   * @type {number}
   * @private
   */
  width = 0;

  /**
   * @type {number}
   * @private
   */
  height = 0;

  /**
   * @type {Array}
   * @private
   */
  dataArray = [];

  /**
   * @type {boolean}
   * @private
   */
  yearVisible = false;

  /**
   * @type {boolean}
   * @private
   */
  hasVisibleData = false;

  /**
   * @type {boolean}
   */
  hasPercentage = false;

  hasArrow = true;

  isUpdating = false;

  constructor (root) {
    super();

    this.root = root;
  }

  initialize () {
    this._createContainer();
    this._createContent();
  }

  startUpdating () {
    this.isUpdating = true;
    requestAnimationFrame(_=> this.update());
  }

  stopUpdating () {
    this.isUpdating = false;
  }

  update () {
    if (this.updateContentRequested) {
      this.updateContent();
      this.updateContentRequested = false;
    }

    if (this.updateDimensionsRequested) {
      this.updateDimensions();
      this.updateDimensionsRequested = false;
    }

    if (this.updatePositionRequested) {
      this.updatePosition();
      this.updatePositionRequested = false;
    }

    if (this.isUpdating) {
      requestAnimationFrame(_=> this.update());
    }
  }

  /**
   * @param {Array} data
   */
  setData (data = []) {
    let oldDataLength = this.dataArray.length;
    this.dataArray = data;
    this.hasVisibleData = this._hasVisibleItems();

    this.updateContentRequested = true;

    if (oldDataLength !== data.length) {
      this.updateDimensionsRequested = true;
    }
  }

  showLabel () {
    addClass(this.container, 'telechart2-chart-label_visible');
    this.startUpdating();
  }

  hideLabel () {
    removeClass(this.container, 'telechart2-chart-label_visible');
    this.stopUpdating();
  }

  showYear () {
    this.yearVisible = true;
  }

  hideYear () {
    this.yearVisible = false;
  }

  updateDimensions () {
    if (!this.hasVisibleData) {
      return;
    }

    this.width = getElementWidth( this.container );
    this.height = getElementHeight( this.container );
    this.rootWidth = getElementWidth( this.root );
  }

  updatePosition () {
    if (!this.hasVisibleData) {
      return;
    }

    const position = this._clampPosition( this.width, this.height );
    this._setLabelPosition( position );
  }

  updateContent () {
    // update inner content
    const data = this.dataArray;

    this._updateTitle( data[ 0 ].x );

    for (let i = 0; i < data.length; ++i) {
      const dataItem = data[ i ];
      const label = dataItem.label;
      this._updateTableItem( label, dataItem );
    }

    if (!this.hasVisibleData) {
      this.hideLabel();
    }
  }

  togglePercentage (state) {
    this.hasPercentage = state;
  }

  toggleArrow (state) {
    this.hasArrow = state;
  }

  onResize () {
    this.updateDimensionsRequested = true;
    this.updatePositionRequested = true;
  }

  /**
   * @private
   */
  _createContainer () {
    const parent = this.root;
    const container = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label',
        style: cssText({
          opacity: 0
        })
      }
    });

    animationTimeout( 200 ).then(_ => {
      setAttributes(container, {
        style: ''
      })
    });

    parent.appendChild( container );

    this.container = container;
  }

  /**
   * @private
   */
  _createContent () {
    // header
    const headerElements = [];

    this.dateElement = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__date'
      }
    });

    headerElements.push( this.dateElement );

    if (this.hasArrow) {
      let icon = createElement('div', {
        attrs: {
          class: 'telechart2-chart-label__header-arrow'
        }
      });

      headerElements.push( icon );
    }

    const dateWrapper = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__header'
      }
    }, headerElements);

    // table
    this.tableElement = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__table'
      }
    }, this._generateTable());

    this.container.appendChild( dateWrapper );
    this.container.appendChild( this.tableElement );
  }

  /**
   * @private
   */
  _generateTable () {
    const items = [];

    for (let i = 0; i < this.dataArray.length; ++i) {
      const dataItem = this.dataArray[ i ];
      items.push( this._createTableItem( dataItem ) );
    }

    return items;
  }

  /**
   * @param {*} dataItem
   * @return {Element}
   * @private
   */
  _createTableItem (dataItem) {
    let titleElements = [];

    if (this.hasPercentage) {
      const percentage = createElement('div', {
        attrs: {
          class: 'telechart2-chart-label__table-item-percentage'
        }
      }, dataItem.percentage || 0);

      titleElements.push( percentage );
    }

    const title = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__table-item-title'
      }
    }, dataItem.name);

    titleElements.push( title );

    const titleWrapper = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__table-item-title-wrapper'
      }
    }, titleElements);

    const value = createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__table-item-value',
        style: cssText({
          color: dataItem.color
        })
      }
    }, String( this.formatNumber( dataItem.y ) ));

    return createElement('div', {
      attrs: {
        class: 'telechart2-chart-label__table-item',
        id: this._getTableItemId( dataItem.label ),
        style: cssText({
          display: dataItem.visible ? 'flex' : 'none'
        })
      }
    }, [ titleWrapper, value ]);
  }

  /**
   * @param {string} label
   * @return {string}
   * @private
   */
  _getTableItemId (label) {
    return `telechart2-chart-label-${this.id}-${label}`;
  }

  /**
   * @param ms
   * @private
   */
  _updateTitle (ms) {
    const date = new Date( ms );
    const dateFormatted = date.toUTCString();
    const dateRegex = /([a-zA-Z]+),\s?\d{1,2}\s([a-zA-Z]+)/i;
    const dateMatch = dateFormatted.match( dateRegex );
    const dayText = dateMatch[ 1 ];
    const monthText = dateMatch[ 2 ];

    let title = `${dayText}, ${monthText} ${date.getDate()}`;

    if (this.yearVisible) {
      title += ` ${date.getFullYear()}`;
    }

    this.dateElement.innerHTML = title;
  }

  /**
   * @private
   */
  _updateTableItem (label, dataItem) {
    const id = this._getTableItemId( label );
    let element = this.tableElement.querySelector( `#${id}` );

    if (!element) {
      element = this._createTableItem( dataItem );
      this.tableElement.appendChild( element );
    }

    const percentageElement = element.querySelector( '.telechart2-chart-label__table-item-percentage' );
    // const titleElement = element.querySelector( '.telechart2-chart-label__table-item-title' );
    const valueElement = element.querySelector( '.telechart2-chart-label__table-item-value' );

    // update styles
    setAttributes(element, {
      style: cssText({
        display: dataItem.visible ? 'flex' : 'none'
      })
    });

    setAttributes(valueElement, {
      style: cssText({
        color: dataItem.color
      })
    });

    // titleElement.innerHTML = dataItem.name;
    valueElement.innerHTML = String( this.formatNumber( dataItem.y ) );

    if (percentageElement) {
      setAttributes(percentageElement, {
        style: cssText({
          display: this.hasPercentage ? 'flex' : 'none'
        })
      });

      percentageElement.innerHTML = `${dataItem.percentage || 0}%`;
    }
  }

  /**
   * @param value
   * @return {*}
   * @private
   */
  formatNumber (value) {
    return ensureNumber( value ).format();
  }

  /**
   * @param {number} width
   * @param {number} height
   * @return {{translateY: number, translateX: number}}
   * @private
   */
  _clampPosition (width, height) {
    const chartWidth = this.rootWidth;
    const labelWidth = this.width;

    const isTouchSupported = isTouchEventsSupported();

    const { left: cursorLeft } = this._getCursorOffset();

    const labelPadding = 8;
    const cursorPadding = isTouchSupported ? 10 : -10;

    const currentDirection = this.containerDirection;
    const isLeft = currentDirection === 'left';
    const isRight = currentDirection === 'right';

    let labelTranslateLeft = cursorLeft - labelWidth - cursorPadding;
    let labelTranslateRight = cursorLeft + cursorPadding;

    let labelTranslateX = isLeft ? labelTranslateLeft : labelTranslateRight;
    let labelTranslateY = 40;

    let allowedRight = false;
    let allowedLeft = false;

    let possibleLabelLeft1 = cursorLeft + labelPadding;
    if (possibleLabelLeft1 + labelWidth <= chartWidth) {
      allowedRight = true;
    }

    let possibleLabelLeft2 = cursorLeft - labelWidth - labelPadding;
    if (possibleLabelLeft2 >= 0) {
      allowedLeft = true;
    }

    if (allowedLeft || allowedRight) {
      if (isLeft && !allowedLeft) {
        this.containerDirection = 'right';
        labelTranslateX = labelTranslateRight;
      }
      if (isRight && !allowedRight) {
        this.containerDirection = 'left';
        labelTranslateX = labelTranslateLeft;
      }
    }

    return {
      translateX: labelTranslateX,
      translateY: labelTranslateY
    };
  }

  /**
   * @return {{top: number, left: number}}
   * @private
   */
  _getCursorOffset () {
    const noop = { left: 0, top: 0 };

    if (!this.dataArray.length) {
      return noop;
    }

    const point = this.dataArray[ 0 ];

    return {
      left: point.canvasX,
      top: point.canvasY
    };
  }

  /**
   * @param {{top: number, left: number, translateY: number, translateX: number}} position
   * @private
   */
  _setLabelPosition (position) {
    const style = {
      transform: `translate(${position.translateX}px, ${position.translateY}px)`
    };

    if (!isTransformSupported()) {
      delete style.transform;

      Object.assign(style, {
        top: `${position.translateY}px`,
        left: `${position.translateX}px`,
      })
    }

    setAttributes(this.container, {
      style: cssText( style )
    });

    this.containerPosition = position;
  }

  /**
   * @return {boolean}
   * @private
   */
  _hasVisibleItems () {
    return this.dataArray.length > 0
      && this.dataArray.filter(item => item.visible).length > 0;
  }
}
