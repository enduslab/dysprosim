"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformOrigin = void 0;
const length_percentage_1 = require("../types/length-percentage");
const tokenizer_1 = require("../syntax/tokenizer");
const DEFAULT_VALUE = {
    type: 16 /* TokenType.PERCENTAGE_TOKEN */,
    number: 50,
    flags: tokenizer_1.FLAG_INTEGER
};
const DEFAULT = [DEFAULT_VALUE, DEFAULT_VALUE];
exports.transformOrigin = {
    name: 'transform-origin',
    initialValue: '50% 50%',
    prefix: true,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (_context, tokens) => {
        const origins = tokens.filter(length_percentage_1.isLengthPercentage);
        if (origins.length !== 2) {
            return DEFAULT;
        }
        return [origins[0], origins[1]];
    }
};
//# sourceMappingURL=transform-origin.js.map