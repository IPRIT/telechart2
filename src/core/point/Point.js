export const PointTypes = {
  point: 'point',
  group: 'group',
};

let POINT_AUTOINCREMENT = 1;

export class Point {

  /**
   * @type {number}
   * @private
   */
  _id = POINT_AUTOINCREMENT++;

  /**
   * @enum 'point' | 'group'
   * @type {string}
   * @private
   */
  _type = 'point';

  /**
   * @type {number}
   * @private
   */
  _x = 0;

  /**
   * @type {number}
   * @private
   */
  _y = 0;

  /**
   * @type {number}
   * @private
   */
  _canvasX = 0;

  /**
   * @type {number}
   * @private
   */
  _canvasY = 0;

  /**
   * @param {number} x
   * @param {number} y
   */
  constructor (x = 0, y = 0) {
    this._x = x;
    this._y = y;
  }

  /**
   * @param {string} pointType
   */
  setType (pointType = 'point') {
    this._type = pointType;
  }

  /**
   * @param {number} x
   */
  setX (x) {
    this._x = x;
  }

  /**
   * @param {number} y
   */
  setY (y) {
    this._y = y;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  setXY (x, y) {
    this.setX( x );
    this.setY( y );
  }

  /**
   * @param {number} x
   */
  addX (x) {
    this._x += x;
  }

  /**
   * @param {number} y
   */
  addY (y) {
    this._y += y;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  addXY (x, y) {
    this.addX( x );
    this.addY( y );
  }

  /**
   * @param {number} svgX
   */
  setCanvasX (svgX) {
    this._canvasX = svgX;
  }

  /**
   * @param {number} svgY
   */
  setCanvasY (svgY) {
    this._canvasY = svgY;
  }

  /**
   * @param {number} canvasX
   * @param {number} canvasY
   */
  setCanvasXY (canvasX, canvasY) {
    this._canvasX = canvasX;
    this._canvasY = canvasY;
  }

  /**
   * @return {number}
   */
  get id () {
    return this._id;
  }

  /**
   * @returns {number}
   */
  get x () {
    return this._x;
  }

  /**
   * @returns {number}
   */
  get y () {
    return this._y;
  }

  /**
   * @return {number}
   */
  get canvasX () {
    return this._canvasX;
  }

  /**
   * @return {number}
   */
  get canvasY () {
    return this._canvasY;
  }

  /**
   * @returns {string}
   */
  get type () {
    return this._type;
  }
}
