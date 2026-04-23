"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textUnderlineOffset = void 0;
const parser_1 = require("../syntax/parser");
exports.textUnderlineOffset = {
    name: 'text-underline-offset',
    initialValue: 'auto',
    prefix: false,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: (_context, token) => {
        if ((0, parser_1.isIdentToken)(token)) {
            if (token.value === 'auto') {
                return 'auto';
            }
        }
        if ((0, parser_1.isDimensionToken)(token)) {
            // Return pixel value
            return token.number;
        }
        // Default to auto
        return 'auto';
    }
};
//# sourceMappingURL=text-underline-offset.js.map