"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor({ id, enabled }) {
        this.id = id;
        this.enabled = enabled;
        this.start = Date.now();
    }
    debug(...args) {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            if (typeof window !== 'undefined' && window.console && typeof console.debug === 'function') {
                // eslint-disable-next-line no-console
                console.debug(this.id, `${this.getTime()}ms`, ...args);
            }
            else {
                this.info(...args);
            }
        }
    }
    getTime() {
        return Date.now() - this.start;
    }
    info(...args) {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            if (typeof window !== 'undefined' && window.console && typeof console.info === 'function') {
                // eslint-disable-next-line no-console
                console.info(this.id, `${this.getTime()}ms`, ...args);
            }
        }
    }
    warn(...args) {
        if (this.enabled) {
            if (typeof window !== 'undefined' && window.console && typeof console.warn === 'function') {
                console.warn(this.id, `${this.getTime()}ms`, ...args);
            }
            else {
                this.info(...args);
            }
        }
    }
    error(...args) {
        if (this.enabled) {
            if (typeof window !== 'undefined' && window.console && typeof console.error === 'function') {
                console.error(this.id, `${this.getTime()}ms`, ...args);
            }
            else {
                this.info(...args);
            }
        }
    }
}
exports.Logger = Logger;
Logger.instances = {};
//# sourceMappingURL=logger.js.map