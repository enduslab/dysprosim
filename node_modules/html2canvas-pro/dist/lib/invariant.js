"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invariant = void 0;
const invariant = (assertion, error) => {
    if (!assertion) {
        console.error(error);
    }
};
exports.invariant = invariant;
//# sourceMappingURL=invariant.js.map