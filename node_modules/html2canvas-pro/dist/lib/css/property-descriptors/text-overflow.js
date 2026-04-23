"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textOverflow = void 0;
exports.textOverflow = {
    name: 'text-overflow',
    initialValue: 'clip',
    prefix: false,
    type: 2 /* PropertyDescriptorParsingType.IDENT_VALUE */,
    parse: (_context, textOverflow) => {
        switch (textOverflow) {
            case 'ellipsis':
                return 1 /* TEXT_OVERFLOW.ELLIPSIS */;
            case 'clip':
            default:
                return 0 /* TEXT_OVERFLOW.CLIP */;
        }
    }
};
//# sourceMappingURL=text-overflow.js.map