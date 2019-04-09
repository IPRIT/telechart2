/**
 * @param {Array<*>} arrayA
 * @param {Array<*>} arrayB
 * @param {string | *} key
 * @return {boolean}
 */
export function arraysEqual (arrayA, arrayB, key = null) {
  if (!Array.isArray(arrayA)
    || !Array.isArray(arrayB)
    || arrayA.length !== arrayB.length) {
    return false;
  }
  for (let i = 0; i < arrayA.length; ++i) {
    if (key) {
      if (arrayA[ i ][ key ] !== arrayB[ i ][ key ]) {
        return false;
      }
    } else if (arrayA[ i ] !== arrayB[ i ]) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {number}
 */
export function arrayMinIndex (array, startIndex = 0, endIndex = array.length - 1) {
  let minIndex = startIndex;
  for (let i = startIndex + 1; i <= endIndex; ++i) {
    if (array[ minIndex ] > array[ i ]) {
      minIndex = i;
    }
  }
  return minIndex;
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {number}
 */
export function arrayMin (array, startIndex = 0, endIndex = array.length - 1) {
  return array[ arrayMinIndex( array, startIndex, endIndex ) ];
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {number}
 */
export function arrayMaxIndex (array, startIndex = 0, endIndex = array.length - 1) {
  let maxIndex = startIndex;
  for (let i = startIndex + 1; i <= endIndex; ++i) {
    if (array[ maxIndex ] < array[ i ]) {
      maxIndex = i;
    }
  }
  return maxIndex;
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {number}
 */
export function arrayMax (array, startIndex = 0, endIndex = array.length - 1) {
  return array[ arrayMaxIndex( array, startIndex, endIndex ) ];
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {Array<number>}
 */
export function arrayMinMaxIndexes (array, startIndex = 0, endIndex = array.length - 1) {
  let minIndex = startIndex;
  let maxIndex = startIndex;
  for (let i = startIndex + 1; i <= endIndex; ++i) {
    if (array[ maxIndex ] < array[ i ]) {
      maxIndex = i;
    }
    if (array[ minIndex ] > array[ i ]) {
      minIndex = i;
    }
  }
  return [ minIndex, maxIndex ];
}

/**
 * @param {Array<number>} array
 * @param {number?} startIndex
 * @param {number?} endIndex
 * @return {Array<number>}
 */
export function arrayMinMax (array, startIndex = 0, endIndex = array.length - 1) {
  const [ minIndex, maxIndex ] = arrayMinMaxIndexes( array, startIndex, endIndex );
  return [
    array[ minIndex ],
    array[ maxIndex ],
  ];
}

/**
 * @param {Array<number>} array
 * @return {number}
 */
export function arraySum (array) {
  let length = array.length;
  let sum = 0;

  while (length--) {
    sum += array[ length ];
  }

  return sum;
}

/**
 * @param {Array<number>} array
 * @return {number}
 */
export function arrayAvg (array) {
  let length = array.length;
  let result = arraySum( array );

  // prevent from dividing by zero
  if (length) {
    result = result / length;
  }

  return result;
}

/**
 * Finds boundary indexes in an array of numbers
 *
 * @param {Array<number>} array
 * @param {number} value
 * @param {number} order
 * @return {[number, number]} Indexes
 * @private
 */
export function binarySearchIndexes (array, value, order = 1) {
  let [ left, right ] = [ 0, array.length - 1 ];

  if (!array.length || order * value < order * array[ left ]) {
    return [ -1, 0 ];
  } else if (order * value > order * array[ right ]) {
    return [ right, right + 1 ];
  }

  while (right - left > 1) {
    let mid = left + (( right - left ) >> 1);
    if (order * value <= order * array[ mid ]) {
      right = mid;
    } else {
      left = mid;
    }
  }

  if (array[ right ] === value) {
    left = right;
  } else if (array[ left ] === value) {
    right = left;
  }

  return [ left, right ];
}

/**
 * Finds boundary indexes in an array of objects
 *
 * @param {Array<Object>} array
 * @param {number} value
 * @param {string} key
 * @param {number} order
 * @return {[number, number]} Indexes
 * @private
 */
export function binarySearchObjectIndexes (array, value, key, order = 1) {
  let [ left, right ] = [ 0, array.length - 1 ];

  if (!array.length || order * value < order * array[ left ][ key ]) {
    return [ -1, 0 ];
  } else if (order * value > order * array[ right ][ key ]) {
    return [ right, right + 1 ];
  }

  while (right - left > 1) {
    let mid = left + (( right - left ) >> 1);
    if (order * value <= order * array[ mid ][ key ]) {
      right = mid;
    } else {
      left = mid;
    }
  }

  if (array[ right ][ key ] === value) {
    left = right;
  } else if (array[ left ][ key ] === value) {
    right = left;
  }

  return [ left, right ];
}

/**
 * @param {Array} arrayA
 * @param {Array} arrayB
 * @return {Array}
 */
export function arrayDiff (arrayA = [], arrayB = []) {
  const dict = Object.create( null );

  for (let i = 0; i < arrayA.length; ++i) {
    dict[ arrayA[ i ] ] = true;
  }

  const result = [];
  for (let i = 0; i < arrayB.length; ++i) {
    if (!dict[ arrayB[ i ] ]) {
      result.push( arrayB[ i ] );
    }
  }

  return result;
}
