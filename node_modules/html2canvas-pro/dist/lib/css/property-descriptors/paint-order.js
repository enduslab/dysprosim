"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paintOrder = void 0;
const parser_1 = require("../syntax/parser");
exports.paintOrder = {
    name: 'paint-order',
    initialValue: 'normal',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (_context, tokens) => {
        const DEFAULT_VALUE = [0 /* PAINT_ORDER_LAYER.FILL */, 1 /* PAINT_ORDER_LAYER.STROKE */, 2 /* PAINT_ORDER_LAYER.MARKERS */];
        const layers = [];
        tokens.filter(parser_1.isIdentToken).forEach((token) => {
            switch (token.value) {
                case 'stroke':
                    layers.push(1 /* PAINT_ORDER_LAYER.STROKE */);
                    break;
                case 'fill':
                    layers.push(0 /* PAINT_ORDER_LAYER.FILL */);
                    break;
                case 'markers':
                    layers.push(2 /* PAINT_ORDER_LAYER.MARKERS */);
                    break;
            }
        });
        DEFAULT_VALUE.forEach((value) => {
            if (layers.indexOf(value) === -1) {
                layers.push(value);
            }
        });
        return layers;
    }
};
//# sourceMappingURL=paint-order.js.map