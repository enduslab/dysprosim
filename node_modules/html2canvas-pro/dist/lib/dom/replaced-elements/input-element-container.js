"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputElementContainer = exports.PLACEHOLDER_COLOR = exports.INPUT_COLOR = exports.PASSWORD = exports.RADIO = exports.CHECKBOX = void 0;
const element_container_1 = require("../element-container");
const bounds_1 = require("../../css/layout/bounds");
const CHECKBOX_BORDER_RADIUS = [
    {
        type: 15 /* TokenType.DIMENSION_TOKEN */,
        flags: 0,
        unit: 'px',
        number: 3
    }
];
const RADIO_BORDER_RADIUS = [
    {
        type: 16 /* TokenType.PERCENTAGE_TOKEN */,
        flags: 0,
        number: 50
    }
];
const reformatInputBounds = (bounds) => {
    if (bounds.width > bounds.height) {
        return new bounds_1.Bounds(bounds.left + (bounds.width - bounds.height) / 2, bounds.top, bounds.height, bounds.height);
    }
    else if (bounds.width < bounds.height) {
        return new bounds_1.Bounds(bounds.left, bounds.top + (bounds.height - bounds.width) / 2, bounds.width, bounds.width);
    }
    return bounds;
};
const getInputValue = (node) => {
    const value = node.type === exports.PASSWORD ? new Array(node.value.length + 1).join('\u2022') : node.value;
    return value.length === 0 ? node.placeholder || '' : value;
};
const isPlaceholder = (node) => {
    return node.value.length === 0 && !!node.placeholder;
};
exports.CHECKBOX = 'checkbox';
exports.RADIO = 'radio';
exports.PASSWORD = 'password';
exports.INPUT_COLOR = 0x2a2a2aff;
// Default placeholder color (similar to browsers: rgba(117, 117, 117, 1) or #757575)
exports.PLACEHOLDER_COLOR = 0x757575ff;
class InputElementContainer extends element_container_1.ElementContainer {
    constructor(context, input) {
        super(context, input);
        this.type = input.type.toLowerCase();
        this.checked = input.checked;
        this.value = getInputValue(input);
        this.isPlaceholder = isPlaceholder(input);
        if (this.type === exports.CHECKBOX || this.type === exports.RADIO) {
            this.styles.backgroundColor = 0xdededeff;
            this.styles.borderTopColor =
                this.styles.borderRightColor =
                    this.styles.borderBottomColor =
                        this.styles.borderLeftColor =
                            0xa5a5a5ff;
            this.styles.borderTopWidth =
                this.styles.borderRightWidth =
                    this.styles.borderBottomWidth =
                        this.styles.borderLeftWidth =
                            1;
            this.styles.borderTopStyle =
                this.styles.borderRightStyle =
                    this.styles.borderBottomStyle =
                        this.styles.borderLeftStyle =
                            1 /* BORDER_STYLE.SOLID */;
            this.styles.backgroundClip = [0 /* BACKGROUND_CLIP.BORDER_BOX */];
            this.styles.backgroundOrigin = [0 /* BACKGROUND_ORIGIN.BORDER_BOX */];
            this.bounds = reformatInputBounds(this.bounds);
        }
        switch (this.type) {
            case exports.CHECKBOX:
                this.styles.borderTopRightRadius =
                    this.styles.borderTopLeftRadius =
                        this.styles.borderBottomRightRadius =
                            this.styles.borderBottomLeftRadius =
                                CHECKBOX_BORDER_RADIUS;
                break;
            case exports.RADIO:
                this.styles.borderTopRightRadius =
                    this.styles.borderTopLeftRadius =
                        this.styles.borderBottomRightRadius =
                            this.styles.borderBottomLeftRadius =
                                RADIO_BORDER_RADIUS;
                break;
        }
    }
}
exports.InputElementContainer = InputElementContainer;
//# sourceMappingURL=input-element-container.js.map