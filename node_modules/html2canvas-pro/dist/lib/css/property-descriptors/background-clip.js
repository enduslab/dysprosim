"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundClip = void 0;
const parser_1 = require("../syntax/parser");
exports.backgroundClip = {
    name: 'background-clip',
    initialValue: 'border-box',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (_context, tokens) => {
        return tokens.map((token) => {
            if ((0, parser_1.isIdentToken)(token)) {
                switch (token.value) {
                    case 'padding-box':
                        return 1 /* BACKGROUND_CLIP.PADDING_BOX */;
                    case 'content-box':
                        return 2 /* BACKGROUND_CLIP.CONTENT_BOX */;
                }
            }
            return 0 /* BACKGROUND_CLIP.BORDER_BOX */;
        });
    }
};
//# sourceMappingURL=background-clip.js.map