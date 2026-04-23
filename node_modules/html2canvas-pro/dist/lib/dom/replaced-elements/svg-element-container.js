"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVGElementContainer = void 0;
const element_container_1 = require("../element-container");
const bounds_1 = require("../../css/layout/bounds");
class SVGElementContainer extends element_container_1.ElementContainer {
    constructor(context, img) {
        super(context, img);
        const s = new XMLSerializer();
        const bounds = (0, bounds_1.parseBounds)(context, img);
        img.setAttribute('width', `${bounds.width}px`);
        img.setAttribute('height', `${bounds.height}px`);
        this.svg = `data:image/svg+xml,${encodeURIComponent(s.serializeToString(img))}`;
        this.intrinsicWidth = img.width.baseVal.value;
        this.intrinsicHeight = img.height.baseVal.value;
        this.context.cache.addImage(this.svg);
    }
}
exports.SVGElementContainer = SVGElementContainer;
//# sourceMappingURL=svg-element-container.js.map