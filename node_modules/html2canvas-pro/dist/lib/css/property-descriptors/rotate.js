"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotate = void 0;
const angle_1 = require("../types/angle");
exports.rotate = {
    name: 'rotate',
    initialValue: 'none',
    prefix: false,
    type: 0 /* PropertyDescriptorParsingType.VALUE */,
    parse: (_context, token) => {
        if (token.type === 20 /* TokenType.IDENT_TOKEN */ && token.value === 'none') {
            return null;
        }
        if (token.type === 17 /* TokenType.NUMBER_TOKEN */) {
            if (token.number === 0) {
                return 0;
            }
        }
        if (token.type === 15 /* TokenType.DIMENSION_TOKEN */) {
            // Parse angle and convert to degrees for storage
            const radians = angle_1.angle.parse(_context, token);
            // Store as degrees for consistency
            return (radians * 180) / Math.PI;
        }
        return null;
    }
};
//# sourceMappingURL=rotate.js.map