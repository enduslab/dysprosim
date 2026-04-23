"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    debug() { }
    static create() { }
    static destroy() { }
    static getInstance() {
        return exports.logger;
    }
    info() { }
    error() { }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map