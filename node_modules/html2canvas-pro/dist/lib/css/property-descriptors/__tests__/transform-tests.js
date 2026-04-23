"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transform_1 = require("../transform");
const parser_1 = require("../../syntax/parser");
const assert_1 = require("assert");
const parseValue = (value) => transform_1.transform.parse({}, parser_1.Parser.parseValue(value));
describe('property-descriptors', () => {
    describe('transform', () => {
        it('none', () => (0, assert_1.deepStrictEqual)(parseValue('none'), null));
        it('matrix(1.0, 2.0, 3.0, 4.0, 5.0, 6.0)', () => (0, assert_1.deepStrictEqual)(parseValue('matrix(1.0, 2.0, 3.0, 4.0, 5.0, 6.0)'), [1, 2, 3, 4, 5, 6]));
        it('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)', () => (0, assert_1.deepStrictEqual)(parseValue('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)'), [1, 0, 0, 1, 0, 0]));
    });
});
//# sourceMappingURL=transform-tests.js.map