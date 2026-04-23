"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIElementContainer = void 0;
const element_container_1 = require("../element-container");
class LIElementContainer extends element_container_1.ElementContainer {
    constructor(context, element) {
        super(context, element);
        this.value = element.value;
    }
}
exports.LIElementContainer = LIElementContainer;
//# sourceMappingURL=li-element-container.js.map