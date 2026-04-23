"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.borderLeftColor = exports.borderBottomColor = exports.borderRightColor = exports.borderTopColor = void 0;
const borderColorForSide = (side) => ({
    name: `border-${side}-color`,
    initialValue: 'transparent',
    prefix: false,
    type: 3 /* PropertyDescriptorParsingType.TYPE_VALUE */,
    format: 'color'
});
exports.borderTopColor = borderColorForSide('top');
exports.borderRightColor = borderColorForSide('right');
exports.borderBottomColor = borderColorForSide('bottom');
exports.borderLeftColor = borderColorForSide('left');
//# sourceMappingURL=border-color.js.map