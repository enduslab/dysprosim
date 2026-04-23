"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webkitGradient = void 0;
const parser_1 = require("../../syntax/parser");
const angle_1 = require("../angle");
const color_1 = require("../color");
const length_percentage_1 = require("../length-percentage");
const webkitGradient = (context, tokens) => {
    const angle = (0, angle_1.deg)(180);
    const stops = [];
    let type = 1 /* CSSImageType.LINEAR_GRADIENT */;
    const shape = 0 /* CSSRadialShape.CIRCLE */;
    const size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
    const position = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach((arg, i) => {
        const firstToken = arg[0];
        if (i === 0) {
            if ((0, parser_1.isIdentToken)(firstToken) && firstToken.value === 'linear') {
                type = 1 /* CSSImageType.LINEAR_GRADIENT */;
                return;
            }
            else if ((0, parser_1.isIdentToken)(firstToken) && firstToken.value === 'radial') {
                type = 2 /* CSSImageType.RADIAL_GRADIENT */;
                return;
            }
        }
        if (firstToken.type === 18 /* TokenType.FUNCTION */) {
            if (firstToken.name === 'from') {
                const color = color_1.color.parse(context, firstToken.values[0]);
                stops.push({ stop: length_percentage_1.ZERO_LENGTH, color });
            }
            else if (firstToken.name === 'to') {
                const color = color_1.color.parse(context, firstToken.values[0]);
                stops.push({ stop: length_percentage_1.HUNDRED_PERCENT, color });
            }
            else if (firstToken.name === 'color-stop') {
                const values = firstToken.values.filter(parser_1.nonFunctionArgSeparator);
                if (values.length === 2) {
                    const color = color_1.color.parse(context, values[1]);
                    const stop = values[0];
                    if ((0, parser_1.isNumberToken)(stop)) {
                        stops.push({
                            stop: { type: 16 /* TokenType.PERCENTAGE_TOKEN */, number: stop.number * 100, flags: stop.flags },
                            color
                        });
                    }
                }
            }
        }
    });
    return type === 1 /* CSSImageType.LINEAR_GRADIENT */
        ? {
            angle: (angle + (0, angle_1.deg)(180)) % (0, angle_1.deg)(360),
            stops,
            type
        }
        : { size, shape, stops, position, type };
};
exports.webkitGradient = webkitGradient;
//# sourceMappingURL=-webkit-gradient.js.map