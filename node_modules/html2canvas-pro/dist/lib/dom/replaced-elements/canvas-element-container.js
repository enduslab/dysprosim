"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasElementContainer = void 0;
const element_container_1 = require("../element-container");
class CanvasElementContainer extends element_container_1.ElementContainer {
    constructor(context, canvas) {
        super(context, canvas);
        this.canvas = canvas;
        this.intrinsicWidth = canvas.width;
        this.intrinsicHeight = canvas.height;
    }
}
exports.CanvasElementContainer = CanvasElementContainer;
//# sourceMappingURL=canvas-element-container.js.map