"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVector = exports.Vector = void 0;
class Vector {
    constructor(x, y) {
        this.type = 0 /* PathType.VECTOR */;
        this.x = x;
        this.y = y;
    }
    add(deltaX, deltaY) {
        return new Vector(this.x + deltaX, this.y + deltaY);
    }
}
exports.Vector = Vector;
const isVector = (path) => path.type === 0 /* PathType.VECTOR */;
exports.isVector = isVector;
//# sourceMappingURL=vector.js.map