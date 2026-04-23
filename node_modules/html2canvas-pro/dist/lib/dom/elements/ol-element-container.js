"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OLElementContainer = void 0;
const element_container_1 = require("../element-container");
class OLElementContainer extends element_container_1.ElementContainer {
    constructor(context, element) {
        super(context, element);
        this.start = element.start;
        this.reversed = typeof element.reversed === 'boolean' && element.reversed === true;
    }
}
exports.OLElementContainer = OLElementContainer;
//# sourceMappingURL=ol-element-container.js.map