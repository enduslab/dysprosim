"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformPath = exports.equalPath = void 0;
const equalPath = (a, b) => {
    if (a.length === b.length) {
        return a.some((v, i) => v === b[i]);
    }
    return false;
};
exports.equalPath = equalPath;
const transformPath = (path, deltaX, deltaY, deltaW, deltaH) => {
    return path.map((point, index) => {
        switch (index) {
            case 0:
                return point.add(deltaX, deltaY);
            case 1:
                return point.add(deltaX + deltaW, deltaY);
            case 2:
                return point.add(deltaX + deltaW, deltaY + deltaH);
            case 3:
                return point.add(deltaX, deltaY + deltaH);
        }
        return point;
    });
};
exports.transformPath = transformPath;
//# sourceMappingURL=path.js.map