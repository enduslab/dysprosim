"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webkitLineClamp = void 0;
/**
 * -webkit-line-clamp property descriptor
 * Used with display: -webkit-box and -webkit-box-orient: vertical
 * to limit text to a specific number of lines
 */
exports.webkitLineClamp = {
    name: '-webkit-line-clamp',
    initialValue: 'none',
    prefix: true,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: (_context, token) => {
        // 'none' means no line clamping
        if (token.type === 20 /* TokenType.IDENT_TOKEN */ && token.value === 'none') {
            return 0;
        }
        // Number value specifies the number of lines
        if (token.type === 17 /* TokenType.NUMBER_TOKEN */) {
            return Math.max(0, Math.floor(token.number));
        }
        // Default to 0 (no clamping)
        return 0;
    }
};
//# sourceMappingURL=webkit-line-clamp.js.map