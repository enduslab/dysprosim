"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linearGradient = void 0;
const parser_1 = require("../../syntax/parser");
const angle_1 = require("../angle");
const gradient_1 = require("./gradient");
const linearGradient = (context, tokens) => {
    let angle = (0, angle_1.deg)(180);
    const stops = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach((arg, i) => {
        if (i === 0) {
            const firstToken = arg[0];
            if (firstToken.type === 20 /* TokenType.IDENT_TOKEN */ && firstToken.value === 'to') {
                angle = (0, angle_1.parseNamedSide)(arg);
                return;
            }
            else if ((0, angle_1.isAngle)(firstToken)) {
                angle = angle_1.angle.parse(context, firstToken);
                return;
            }
        }
        const colorStop = (0, gradient_1.parseColorStop)(context, arg);
        stops.push(colorStop);
    });
    return { angle, stops, type: 1 /* CSSImageType.LINEAR_GRADIENT */ };
};
exports.linearGradient = linearGradient;
//# sourceMappingURL=linear-gradient.js.map