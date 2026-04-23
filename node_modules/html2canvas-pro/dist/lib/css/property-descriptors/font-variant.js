"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontVariant = void 0;
const parser_1 = require("../syntax/parser");
exports.fontVariant = {
    name: 'font-variant',
    initialValue: 'none',
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    prefix: false,
    parse: (_context, tokens) => {
        return tokens.filter(parser_1.isIdentToken).map((token) => token.value);
    }
};
//# sourceMappingURL=font-variant.js.map