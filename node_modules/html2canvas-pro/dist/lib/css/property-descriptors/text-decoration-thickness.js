"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textDecorationThickness = void 0;
const parser_1 = require("../syntax/parser");
exports.textDecorationThickness = {
    name: 'text-decoration-thickness',
    initialValue: 'auto',
    prefix: false,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: (_context, token) => {
        if ((0, parser_1.isIdentToken)(token)) {
            switch (token.value) {
                case 'auto':
                    return 'auto';
                case 'from-font':
                    return 'from-font';
            }
        }
        if ((0, parser_1.isDimensionToken)(token)) {
            // Convert to pixels
            return token.number;
        }
        // Default to auto
        return 'auto';
    }
};
//# sourceMappingURL=text-decoration-thickness.js.map