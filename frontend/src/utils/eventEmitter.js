const eventEmitter = {
    _events: {},
    dispatch(event, data) {
      if (!this._events[event]) return;
      this._events[event].forEach(callback => callback(data));
    },
    subscribe(event, callback) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(callback);
      // Return an unsubscribe function
      return () => {
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      };
    },
    unsubscribe(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
  };
  
  export default eventEmitter;