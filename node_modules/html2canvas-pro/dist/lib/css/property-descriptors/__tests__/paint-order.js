"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const parser_1 = require("../../syntax/parser");
const paint_order_1 = require("../paint-order");
const paintOrderParse = (value) => paint_order_1.paintOrder.parse({}, parser_1.Parser.parseValues(value));
describe('property-descriptors', () => {
    describe('paint-order', () => {
        it('none', () => (0, assert_1.deepStrictEqual)(paintOrderParse('none'), [
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('EMPTY', () => (0, assert_1.deepStrictEqual)(paintOrderParse(''), [
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('other values', () => (0, assert_1.deepStrictEqual)(paintOrderParse('other values'), [
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('normal', () => (0, assert_1.deepStrictEqual)(paintOrderParse('normal'), [
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('stroke', () => (0, assert_1.deepStrictEqual)(paintOrderParse('stroke'), [
            1 /* PAINT_ORDER_LAYER.STROKE */,
            0 /* PAINT_ORDER_LAYER.FILL */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('fill', () => (0, assert_1.deepStrictEqual)(paintOrderParse('fill'), [
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('markers', () => (0, assert_1.deepStrictEqual)(paintOrderParse('markers'), [
            2 /* PAINT_ORDER_LAYER.MARKERS */,
            0 /* PAINT_ORDER_LAYER.FILL */,
            1 /* PAINT_ORDER_LAYER.STROKE */
        ]));
        it('stroke fill', () => (0, assert_1.deepStrictEqual)(paintOrderParse('stroke fill'), [
            1 /* PAINT_ORDER_LAYER.STROKE */,
            0 /* PAINT_ORDER_LAYER.FILL */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
        it('markers stroke', () => (0, assert_1.deepStrictEqual)(paintOrderParse('markers stroke'), [
            2 /* PAINT_ORDER_LAYER.MARKERS */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            0 /* PAINT_ORDER_LAYER.FILL */
        ]));
        it('markers stroke fill', () => (0, assert_1.deepStrictEqual)(paintOrderParse('markers stroke fill'), [
            2 /* PAINT_ORDER_LAYER.MARKERS */,
            1 /* PAINT_ORDER_LAYER.STROKE */,
            0 /* PAINT_ORDER_LAYER.FILL */
        ]));
        it('stroke fill markers', () => (0, assert_1.deepStrictEqual)(paintOrderParse('stroke fill markers'), [
            1 /* PAINT_ORDER_LAYER.STROKE */,
            0 /* PAINT_ORDER_LAYER.FILL */,
            2 /* PAINT_ORDER_LAYER.MARKERS */
        ]));
    });
});
//# sourceMappingURL=paint-order.js.map