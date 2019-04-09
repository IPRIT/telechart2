/**
 * Simple event emitter for better performance and app size
 *
 * @author Alexander Belov
 */
export class EventEmitter {

  /**
   * @type {*}
   * @private
   */
  _eventListeners = {};

  /**
   * @param {string} eventName
   * @param {*} args
   */
  emit (eventName, ...args) {
    this._fireEvent( eventName, ...args );
  }

  /**
   * @param {string} eventName
   * @param {Function} cb
   * @param {*} context
   */
  on (eventName, cb, context = null) {
    this.addEventListener( eventName, cb, context );
  }

  /**
   * @param {string} eventName
   * @param {Function} cb
   * @param {*} context
   */
  once (eventName, cb, context = null) {
    this.addEventListenerOnce( eventName, cb, context );
  }

  /**
   * @param {string} eventName
   * @param {Function} cb
   * @param {*} context
   */
  addEventListener (eventName, cb, context = null) {
    if (!cb) {
      return;
    }

    this._subscribeEvent( eventName, cb, context );
  }

  /**
   * @param {string} eventName
   * @param {Function} cb
   * @param {*} context
   */
  addEventListenerOnce (eventName, cb, context = null) {
    if (!cb) {
      return;
    }

    const listener = (...args) => {
      cb.apply( context, args );
      this.removeEventListener( eventName, listener );
    };

    this.addEventListener( eventName, listener );
  }

  /**
   * @param {string} eventName
   * @param {Function} listener
   */
  removeEventListener (eventName, listener) {
    if (!this._eventListeners[ eventName ]) {
      return;
    }

    const listenerIndex = this._eventListeners[ eventName ].findIndex(([ cb ]) => {
      return listener === cb;
    });

    if (listenerIndex < 0) {
      return;
    }

    this._eventListeners[ eventName ].splice( listenerIndex, 1 );
  }

  /**
   * @param {string | *} eventName
   */
  removeAllListeners (eventName = null) {
    if (!eventName) {
      this._eventListeners = {};
    } else if (this._eventListeners[ eventName ]) {
      this._eventListeners[ eventName ] = null;
      delete this._eventListeners[ eventName ];
    }
  }

  /**
   * @param {string} eventName
   * @private
   */
  _allocateEvent (eventName) {
    this._eventListeners[ eventName ] = this._eventListeners[ eventName ] || []
  }

  /**
   * @param {string} eventName
   * @param {Function} cb
   * @param {*} context
   */
  _subscribeEvent (eventName, cb, context) {
    this._allocateEvent( eventName );
    this._eventListeners[ eventName ].push([ cb, context ]);
  }

  /**
   * @param {string} eventName
   * @param {*} args
   * @private
   */
  _fireEvent (eventName, ...args) {
    const eventListeners = this._eventListeners[ eventName ] || [];

    for (let i = 0; i < eventListeners.length; ++i) {
      const [ cb, context ] = eventListeners[ i ];
      cb.apply( context, args );
    }
  }
}
