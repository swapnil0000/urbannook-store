const { EventEmitter } = require("events");

// Singleton emitter that decouples the Change Stream from SSE connections.
// Any module can emit "new_order"; SSE handlers listen to it.
const orderEventEmitter = new EventEmitter();

// Raise the listener cap to support many concurrent admin browser tabs
// without triggering Node's MaxListenersExceededWarning
orderEventEmitter.setMaxListeners(100);

module.exports = orderEventEmitter;
