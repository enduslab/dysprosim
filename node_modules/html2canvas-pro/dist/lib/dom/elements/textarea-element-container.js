"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextareaElementContainer = void 0;
const element_container_1 = require("../element-container");
class TextareaElementContainer extends element_container_1.ElementContainer {
    constructor(context, element) {
        super(context, element);
        this.value = element.value;
    }
}
exports.TextareaElementContainer = TextareaElementContainer;
//# sourceMappingURL=textarea-element-container.js.map