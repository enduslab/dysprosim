"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const tokenizer_1 = require("../tokenizer");
const tokenize = (value) => {
    const tokenizer = new tokenizer_1.Tokenizer();
    tokenizer.write(value);
    return tokenizer.read();
};
describe('tokenizer', () => {
    describe('<ident>', () => {
        it('auto', () => (0, assert_1.deepEqual)(tokenize('auto'), [{ type: 20 /* TokenType.IDENT_TOKEN */, value: 'auto' }]));
        it('url', () => (0, assert_1.deepEqual)(tokenize('url'), [{ type: 20 /* TokenType.IDENT_TOKEN */, value: 'url' }]));
        it('auto test', () => (0, assert_1.deepEqual)(tokenize('auto        test'), [
            { type: 20 /* TokenType.IDENT_TOKEN */, value: 'auto' },
            { type: 31 /* TokenType.WHITESPACE_TOKEN */ },
            { type: 20 /* TokenType.IDENT_TOKEN */, value: 'test' }
        ]));
    });
    describe('<url-token>', () => {
        it('url(test.jpg)', () => (0, assert_1.deepEqual)(tokenize('url(test.jpg)'), [{ type: 22 /* TokenType.URL_TOKEN */, value: 'test.jpg' }]));
        it('url("test.jpg")', () => (0, assert_1.deepEqual)(tokenize('url("test.jpg")'), [{ type: 22 /* TokenType.URL_TOKEN */, value: 'test.jpg' }]));
        it("url('test.jpg')", () => (0, assert_1.deepEqual)(tokenize("url('test.jpg')"), [{ type: 22 /* TokenType.URL_TOKEN */, value: 'test.jpg' }]));
    });
});
//# sourceMappingURL=tokernizer-tests.js.map