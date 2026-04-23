"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textDecorationStyle = void 0;
exports.textDecorationStyle = {
    name: 'text-decoration-style',
    initialValue: 'solid',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: (_context, style) => {
        switch (style) {
            case 'double':
                return 1 /* TEXT_DECORATION_STYLE.DOUBLE */;
            case 'dotted':
                return 2 /* TEXT_DECORATION_STYLE.DOTTED */;
            case 'dashed':
                return 3 /* TEXT_DECORATION_STYLE.DASHED */;
            case 'wavy':
                return 4 /* TEXT_DECORATION_STYLE.WAVY */;
            case 'solid':
            default:
                return 0 /* TEXT_DECORATION_STYLE.SOLID */;
        }
    }
};
//# sourceMappingURL=text-decoration-style.js.map