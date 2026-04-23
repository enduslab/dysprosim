"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.radialGradient = exports.CONTAIN = exports.COVER = exports.ELLIPSE = exports.CIRCLE = exports.FARTHEST_CORNER = exports.CLOSEST_CORNER = exports.FARTHEST_SIDE = exports.CLOSEST_SIDE = void 0;
const parser_1 = require("../../syntax/parser");
const gradient_1 = require("./gradient");
const length_percentage_1 = require("../length-percentage");
const length_1 = require("../length");
exports.CLOSEST_SIDE = 'closest-side';
exports.FARTHEST_SIDE = 'farthest-side';
exports.CLOSEST_CORNER = 'closest-corner';
exports.FARTHEST_CORNER = 'farthest-corner';
exports.CIRCLE = 'circle';
exports.ELLIPSE = 'ellipse';
exports.COVER = 'cover';
exports.CONTAIN = 'contain';
const radialGradient = (context, tokens) => {
    let shape = 0 /* CSSRadialShape.CIRCLE */;
    let size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
    const stops = [];
    const position = [];
    (0, parser_1.parseFunctionArgs)(tokens).forEach((arg, i) => {
        let isColorStop = true;
        if (i === 0) {
            let isAtPosition = false;
            isColorStop = arg.reduce((acc, token) => {
                if (isAtPosition) {
                    if ((0, parser_1.isIdentToken)(token)) {
                        switch (token.value) {
                            case 'center':
                                position.push(length_percentage_1.FIFTY_PERCENT);
                                return acc;
                            case 'top':
                            case 'left':
                                position.push(length_percentage_1.ZERO_LENGTH);
                                return acc;
                            case 'right':
                            case 'bottom':
                                position.push(length_percentage_1.HUNDRED_PERCENT);
                                return acc;
                        }
                    }
                    else if ((0, length_percentage_1.isLengthPercentage)(token) || (0, length_1.isLength)(token)) {
                        position.push(token);
                    }
                }
                else if ((0, parser_1.isIdentToken)(token)) {
                    switch (token.value) {
                        case exports.CIRCLE:
                            shape = 0 /* CSSRadialShape.CIRCLE */;
                            return false;
                        case exports.ELLIPSE:
                            shape = 1 /* CSSRadialShape.ELLIPSE */;
                            return false;
                        case 'at':
                            isAtPosition = true;
                            return false;
                        case exports.CLOSEST_SIDE:
                            size = 0 /* CSSRadialExtent.CLOSEST_SIDE */;
                            return false;
                        case exports.COVER:
                        case exports.FARTHEST_SIDE:
                            size = 1 /* CSSRadialExtent.FARTHEST_SIDE */;
                            return false;
                        case exports.CONTAIN:
                        case exports.CLOSEST_CORNER:
                            size = 2 /* CSSRadialExtent.CLOSEST_CORNER */;
                            return false;
                        case exports.FARTHEST_CORNER:
                            size = 3 /* CSSRadialExtent.FARTHEST_CORNER */;
                            return false;
                    }
                }
                else if ((0, length_1.isLength)(token) || (0, length_percentage_1.isLengthPercentage)(token)) {
                    if (!Array.isArray(size)) {
                        size = [];
                    }
                    size.push(token);
                    return false;
                }
                return acc;
            }, isColorStop);
        }
        if (isColorStop) {
            const colorStop = (0, gradient_1.parseColorStop)(context, arg);
            stops.push(colorStop);
        }
    });
    return { size, shape, stops, position, type: 2 /* CSSImageType.RADIAL_GRADIENT */ };
};
exports.radialGradient = radialGradient;
//# sourceMappingURL=radial-gradient.js.map