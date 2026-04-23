"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundImage = void 0;
const image_1 = require("../types/image");
const parser_1 = require("../syntax/parser");
exports.backgroundImage = {
    name: 'background-image',
    initialValue: 'none',
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    prefix: false,
    parse: (context, tokens) => {
        if (tokens.length === 0) {
            return [];
        }
        const first = tokens[0];
        if (first.type === 20 /* TokenType.IDENT_TOKEN */ && first.value === 'none') {
            return [];
        }
        return tokens
            .filter((value) => (0, parser_1.nonFunctionArgSeparator)(value) && (0, image_1.isSupportedImage)(value))
            .map((value) => image_1.image.parse(context, value));
    }
};
//# sourceMappingURL=background-image.js.map