"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.content = void 0;
exports.content = {
    name: 'content',
    initialValue: 'none',
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    prefix: false,
    parse: (_context, tokens) => {
        if (tokens.length === 0) {
            return [];
        }
        const first = tokens[0];
        if (first.type === 20 /* TokenType.IDENT_TOKEN */ && first.value === 'none') {
            return [];
        }
        return tokens;
    }
};
//# sourceMappingURL=content.js.map