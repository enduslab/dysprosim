"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.counterReset = void 0;
const parser_1 = require("../syntax/parser");
exports.counterReset = {
    name: 'counter-reset',
    initialValue: 'none',
    prefix: true,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (_context, tokens) => {
        if (tokens.length === 0) {
            return [];
        }
        const resets = [];
        const filtered = tokens.filter(parser_1.nonWhiteSpace);
        for (let i = 0; i < filtered.length; i++) {
            const counter = filtered[i];
            const next = filtered[i + 1];
            if ((0, parser_1.isIdentToken)(counter) && counter.value !== 'none') {
                const reset = next && (0, parser_1.isNumberToken)(next) ? next.number : 0;
                resets.push({ counter: counter.value, reset });
            }
        }
        return resets;
    }
};
//# sourceMappingURL=counter-reset.js.map