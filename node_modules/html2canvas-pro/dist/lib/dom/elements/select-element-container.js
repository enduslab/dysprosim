"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectElementContainer = void 0;
const element_container_1 = require("../element-container");
class SelectElementContainer extends element_container_1.ElementContainer {
    constructor(context, element) {
        super(context, element);
        const option = element.options[element.selectedIndex || 0];
        this.value = option ? option.text || '' : '';
    }
}
exports.SelectElementContainer = SelectElementContainer;
//# sourceMappingURL=select-element-container.js.map