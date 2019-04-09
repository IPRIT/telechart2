import { EventEmitter } from '../misc/EventEmitter';
import {
  addClass, clampNumber,
  createElement,
  cssText, getDocumentScrollTop,
  getElementHeight, getElementOffset,
  getElementWidth, isTransformSupported,
  removeClass,
  setAttributes
} from '../../utils';

let LABEL_ID = 1;

export class Label extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = LABEL_ID++;

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
   * @type {{top: number, left: number, translateY: number, translateX: number}}
   * @private
   */
  _containerPosition = {
    translateX: 0,
    translateY: 0,
    top: 0,
    left: 0
  };

  /**
   * @type {Element}
   * @private
   */
  _dateElement = null;

  /**
   * @type {Element}
   * @private
   */
  _tableElement = null;

  /**
   * @type {number}
   * @private
   */
  _width = 0;

  /**
   * @type {number}
   * @private
   */
  _height = 0;

  /**
   * @type {Array}
   * @private
   */
  _dataArray = [];

  /**
   * @type {boolean}
   * @private
   */
  _yearVisible = false;

  /**
   * @type {boolean}
   * @private
   */
  _hasVisibleData = false;

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
    this._createContent();
  }

  /**
   * @param {*} deltaTime
   */
  update (deltaTime) {
    if (this._positionUpdateNeeded) {
      if (this._hasVisibleData) {
        this.updateDimensions();
        this.updatePosition();
      }

      this._positionUpdateNeeded = false;
    }
  }

  /**
   * @param {Array} data
   */
  setData (data = []) {
    this._dataArray = data;
    this._hasVisibleData = this._hasVisibleItems();

    this._updateContent();
  }

  showLabel () {
    addClass(this._container, 'telechart-chart-label_visible');
  }

  hideLabel () {
    removeClass(this._container, 'telechart-chart-label_visible');
  }

  showYear () {
    this._yearVisible = true;
  }

  hideYear () {
    this._yearVisible = false;
  }

  updateDimensions () {
    if (!this._hasVisibleData) {
      return;
    }

    this._width = getElementWidth( this._container );
    this._height = getElementHeight( this._container );
  }

  updatePosition () {
    if (!this._hasVisibleData) {
      return;
    }

    const position = this._clampPosition( this._width, this._height );
    this._setLabelPosition( position );
  }

  requestUpdatePosition () {
    this._positionUpdateNeeded = true;
  }

  /**
   * @return {boolean}
   */
  get hasVisibleData () {
    return this._hasVisibleData;
  }

  /**
   * @private
   */
  _createContainer () {
    const parent = this._renderer.parentContainer;
    const container = createElement('div', {
      attrs: {
        class: 'telechart-chart-label',
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
  _createContent () {
    this._dateElement = createElement('div', {
      attrs: {
        class: 'telechart-chart-label__date'
      }
    });

    this._tableElement = createElement('div', {
      attrs: {
        class: 'telechart-chart-label__table'
      }
    }, this._generateTable());

    this._container.appendChild( this._dateElement );
    this._container.appendChild( this._tableElement );
  }

  /**
   * @private
   */
  _generateTable () {
    const items = [];

    for (let i = 0; i < this._dataArray.length; ++i) {
      const dataItem = this._dataArray[ i ];
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
    const value = createElement('div', {
      attrs: {
        class: 'telechart-chart-label__table-item-value'
      }
    }, String( this._toPrecise( dataItem.y ) ));

    const title = createElement('div', {
      attrs: {
        class: 'telechart-chart-label__table-item-title'
      }
    }, dataItem.name);

    return createElement('div', {
      attrs: {
        class: 'telechart-chart-label__table-item',
        id: this._getTableItemId( dataItem.label ),
        style: cssText({
          color: dataItem.color,
          display: dataItem.visible ? 'block' : 'none'
        })
      }
    }, [ value, title ]);
  }

  /**
   * @param {string} label
   * @return {string}
   * @private
   */
  _getTableItemId (label) {
    return `telechart-chart-label-${this._id}-${label}`;
  }

  /**
   * @private
   */
  _updateContent () {
    // update inner content
    const data = this._dataArray;

    this._updateTitle( data[ 0 ].x );

    for (let i = 0; i < data.length; ++i) {
      const dataItem = data[ i ];
      // if (dataItem.visible) {
        const label = dataItem.label;
        this._updateTableItem( label, dataItem );
      // }
    }

    if (!this._hasVisibleData) {
      this.hideLabel();
    }
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

    if (this._yearVisible) {
      title += ` ${date.getFullYear()}`;
    }

    this._dateElement.innerHTML = title;
  }

  /**
   * @private
   */
  _updateTableItem (label, dataItem) {
    const id = this._getTableItemId( label );
    let element = this._tableElement.querySelector( `#${id}` );

    if (!element) {
      element = this._createTableItem( dataItem );
      this._tableElement.appendChild( element );
    }

    const titleElement = element.querySelector( '.telechart-chart-label__table-item-title' );
    const valueElement = element.querySelector( '.telechart-chart-label__table-item-value' );

    // update styles
    setAttributes(element, {
      style: cssText({
        color: dataItem.color,
        display: dataItem.visible ? 'block' : 'none'
      })
    });

    titleElement.innerHTML = dataItem.name;
    valueElement.innerHTML = String( this._toPrecise( dataItem.y ) );
  }

  /**
   * @param {number} value
   * @param {number} precise
   * @return {number}
   * @private
   */
  _toPrecise (value, precise = 2) {
    return 1 * value.toFixed( precise );
  }

  /**
   * @param {number} width
   * @param {number} height
   * @return {{top: number, left: number, translateY: number, translateX: number}}
   * @private
   */
  _clampPosition (width, height) {
    const chartWidth = this._renderer.width;
    const labelWidth = this._width;
    const labelHeight = this._height;
    const { left: cursorLeft, top: cursorTop } = this._getCursorOffset();
    const leftRightPadding = 4;
    const labelPadding = 8;

    let labelTranslateX = clampNumber( cursorLeft - 30, leftRightPadding, chartWidth - labelWidth - leftRightPadding );
    let labelTranslateY = 40;

    let labelLeft = labelTranslateX;
    let labelTop = labelTranslateY;

    let labelBottomLine = labelTranslateY + labelHeight + leftRightPadding;

    if (labelBottomLine > cursorTop) {
      let possibleLabelLeft1 = cursorLeft + labelPadding;
      if (possibleLabelLeft1 + labelWidth <= chartWidth) {
        labelLeft = possibleLabelLeft1;
      } else {
        let possibleLabelLeft2 = cursorLeft - labelWidth - labelPadding;
        if (possibleLabelLeft2 >= 0) {
          labelLeft = possibleLabelLeft2;
        } else {
          let possibleLabelTop1 = cursorTop - labelHeight - labelPadding;
          let documentScrollTop = getDocumentScrollTop();
          let { top: chartOffsetTop } = getElementOffset( this._renderer.parentContainer );

          if (chartOffsetTop + possibleLabelTop1 >= documentScrollTop) {
            labelTop = possibleLabelTop1;
          } else {
            labelTop = documentScrollTop - chartOffsetTop;
          }
        }
      }
    }

    if (isTransformSupported) {
      labelTop -= labelTranslateY;
      labelLeft -= labelTranslateX;
    }

    return {
      translateX: labelTranslateX,
      translateY: labelTranslateY,

      top: labelTop,
      left: labelLeft
    };
  }

  /**
   * @return {{top: number, left: number}}
   * @private
   */
  _getCursorOffset () {
    const noop = { left: 0, top: 0 };

    if (!this._dataArray.length) {
      return noop;
    }

    const chartOffsetY = this._chart._seriesGroupTop || 0;

    let minIndex = -1;
    let minY = 1e9;
    for (let i = 0; i < this._dataArray.length; ++i) {
      const dataItem = this._dataArray[ i ];
      if (dataItem.visible && minY > dataItem.canvasY) {
        minIndex = i;
        minY = dataItem.canvasY;
      }
    }

    const point = this._dataArray[ minIndex ];

    return {
      left: point.canvasX,
      top: point.canvasY + chartOffsetY
    };
  }

  /**
   * @param {{top: number, left: number, translateY: number, translateX: number}} position
   * @private
   */
  _setLabelPosition (position) {
    const style = {
      transform: `translate(${position.translateX}px, ${position.translateY}px)`,
      top: `${position.top}px`,
      left: `${position.left}px`,
    };

    if (!isTransformSupported) {
      delete style.transform;
    }

    setAttributes(this._container, {
      style: cssText( style )
    });

    this._containerPosition = position;
  }

  /**
   * @return {boolean}
   * @private
   */
  _hasVisibleItems () {
    return this._dataArray.length > 0
      && this._dataArray.filter(item => item.visible).length > 0;
  }
}
