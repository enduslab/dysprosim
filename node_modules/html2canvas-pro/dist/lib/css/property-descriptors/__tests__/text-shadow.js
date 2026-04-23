"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const parser_1 = require("../../syntax/parser");
const color_1 = require("../../types/color");
const text_shadow_1 = require("../text-shadow");
const tokenizer_1 = require("../../syntax/tokenizer");
const length_percentage_1 = require("../../types/length-percentage");
const textShadowParse = (value) => text_shadow_1.textShadow.parse({}, parser_1.Parser.parseValues(value));
const colorParse = (value) => color_1.color.parse({}, parser_1.Parser.parseValue(value));
const dimension = (number, unit) => ({
    flags: tokenizer_1.FLAG_INTEGER,
    number,
    unit,
    type: 15 /* TokenType.DIMENSION_TOKEN */
});
describe('property-descriptors', () => {
    describe('text-shadow', () => {
        it('none', () => (0, assert_1.deepStrictEqual)(textShadowParse('none'), []));
        it('1px 1px 2px pink', () => (0, assert_1.deepStrictEqual)(textShadowParse('1px 1px 2px pink'), [
            {
                color: colorParse('pink'),
                offsetX: dimension(1, 'px'),
                offsetY: dimension(1, 'px'),
                blur: dimension(2, 'px')
            }
        ]));
        it('#fc0 1px 0 10px', () => (0, assert_1.deepStrictEqual)(textShadowParse('#fc0 1px 0 10px'), [
            {
                color: colorParse('#fc0'),
                offsetX: dimension(1, 'px'),
                offsetY: length_percentage_1.ZERO_LENGTH,
                blur: dimension(10, 'px')
            }
        ]));
        it('5px 5px #558abb', () => (0, assert_1.deepStrictEqual)(textShadowParse('5px 5px #558abb'), [
            {
                color: colorParse('#558abb'),
                offsetX: dimension(5, 'px'),
                offsetY: dimension(5, 'px'),
                blur: length_percentage_1.ZERO_LENGTH
            }
        ]));
        it('white 2px 5px', () => (0, assert_1.deepStrictEqual)(textShadowParse('white 2px 5px'), [
            {
                color: colorParse('#fff'),
                offsetX: dimension(2, 'px'),
                offsetY: dimension(5, 'px'),
                blur: length_percentage_1.ZERO_LENGTH
            }
        ]));
        it('white 2px 5px', () => (0, assert_1.deepStrictEqual)(textShadowParse('5px 10px'), [
            {
                color: color_1.COLORS.TRANSPARENT,
                offsetX: dimension(5, 'px'),
                offsetY: dimension(10, 'px'),
                blur: length_percentage_1.ZERO_LENGTH
            }
        ]));
        it('1px 1px 2px red, 0 0 1em blue, 0 0 2em blue', () => (0, assert_1.deepStrictEqual)(textShadowParse('1px 1px 2px red, 0 0 1em blue, 0 0 2em blue'), [
            {
                color: colorParse('red'),
                offsetX: dimension(1, 'px'),
                offsetY: dimension(1, 'px'),
                blur: dimension(2, 'px')
            },
            {
                color: colorParse('blue'),
                offsetX: length_percentage_1.ZERO_LENGTH,
                offsetY: length_percentage_1.ZERO_LENGTH,
                blur: dimension(1, 'em')
            },
            {
                color: colorParse('blue'),
                offsetX: length_percentage_1.ZERO_LENGTH,
                offsetY: length_percentage_1.ZERO_LENGTH,
                blur: dimension(2, 'em')
            }
        ]));
    });
});
//# sourceMappingURL=text-shadow.js.map