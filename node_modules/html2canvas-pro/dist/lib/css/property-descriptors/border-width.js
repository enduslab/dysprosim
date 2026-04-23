"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.borderLeftWidth = exports.borderBottomWidth = exports.borderRightWidth = exports.borderTopWidth = void 0;
const parser_1 = require("../syntax/parser");
const borderWidthForSide = (side) => ({
    name: `border-${side}-width`,
    initialValue: '0',
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    prefix: false,
    parse: (_context, token) => {
        if ((0, parser_1.isDimensionToken)(token)) {
            return token.number;
        }
        return 0;
    }
});
exports.borderTopWidth = borderWidthForSide('top');
exports.borderRightWidth = borderWidthForSide('right');
exports.borderBottomWidth = borderWidthForSide('bottom');
exports.borderLeftWidth = borderWidthForSide('left');
//# sourceMappingURL=border-width.js.map