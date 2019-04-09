import { Point, PointTypes } from './Point';
import { arrayAvg } from '../../utils/index';

export class PointGroup extends Point {

  /**
   * @type {Array<Point>}
   * @private
   */
  _pointsGroup = [];

  /**
   * @type {arrayAvg}
   * @private
   */
  _approximationFn = arrayAvg;

  /**
   * @param {Array<Point>} points
   * @param {boolean?} autoCompute
   */
  constructor (points = [], autoCompute = true) {
    super();
    this.setType( PointTypes.group );
    this.setPointsGroup( points, autoCompute );
  }

  /**
   * @param {Array<Point>} points
   * @param {boolean?} autoCompute
   */
  setPointsGroup (points, autoCompute = true) {
    this._pointsGroup = points;

    if (autoCompute) {
      this.approximate();
    }
  }

  /**
   * @private
   */
  approximate () {
    this.setX( this._approximateX() );
    this.setY( this._approximateY() );
  }

  /**
   * @return {number}
   * @private
   */
  _approximateX () {
    return this._approximationFn(
      this._pointsGroup.map(p => p.x)
    );
  }

  /**
   * @return {number}
   * @private
   */
  _approximateY () {
    return this._approximationFn(
      this._pointsGroup.map(p => p.y)
    );
  }
}
