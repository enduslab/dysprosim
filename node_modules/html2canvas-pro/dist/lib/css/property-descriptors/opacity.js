"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opacity = void 0;
const parser_1 = require("../syntax/parser");
exports.opacity = {
    name: 'opacity',
    initialValue: '1',
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    prefix: false,
    parse: (_context, token) => {
        if ((0, parser_1.isNumberToken)(token)) {
            return token.number;
        }
        return 1;
    }
};
//# sourceMappingURL=opacity.js.map