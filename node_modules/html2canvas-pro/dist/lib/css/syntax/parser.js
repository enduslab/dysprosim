"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFunctionArgs = exports.nonFunctionArgSeparator = exports.nonWhiteSpace = exports.isIdentWithValue = exports.isStringToken = exports.isIdentToken = exports.isNumberToken = exports.isDimensionToken = exports.Parser = void 0;
const tokenizer_1 = require("./tokenizer");
class Parser {
    constructor(tokens) {
        this._tokens = tokens;
    }
    static create(value) {
        const tokenizer = new tokenizer_1.Tokenizer();
        tokenizer.write(value);
        return new Parser(tokenizer.read());
    }
    static parseValue(value) {
        return Parser.create(value).parseComponentValue();
    }
    static parseValues(value) {
        return Parser.create(value).parseComponentValues();
    }
    parseComponentValue() {
        let token = this.consumeToken();
        while (token.type === 31 /* TokenType.WHITESPACE_TOKEN */) {
            token = this.consumeToken();
        }
        if (token.type === 32 /* TokenType.EOF_TOKEN */) {
            throw new SyntaxError(`Error parsing CSS component value, unexpected EOF`);
        }
        this.reconsumeToken(token);
        const value = this.consumeComponentValue();
        do {
            token = this.consumeToken();
        } while (token.type === 31 /* TokenType.WHITESPACE_TOKEN */);
        if (token.type === 32 /* TokenType.EOF_TOKEN */) {
            return value;
        }
        throw new SyntaxError(`Error parsing CSS component value, multiple values found when expecting only one`);
    }
    parseComponentValues() {
        const values = [];
        while (true) {
            const value = this.consumeComponentValue();
            if (value.type === 32 /* TokenType.EOF_TOKEN */) {
                return values;
            }
            values.push(value);
            values.push();
        }
    }
    consumeComponentValue() {
        const token = this.consumeToken();
        switch (token.type) {
            case 11 /* TokenType.LEFT_CURLY_BRACKET_TOKEN */:
            case 28 /* TokenType.LEFT_SQUARE_BRACKET_TOKEN */:
            case 2 /* TokenType.LEFT_PARENTHESIS_TOKEN */:
                return this.consumeSimpleBlock(token.type);
            case 19 /* TokenType.FUNCTION_TOKEN */:
                return this.consumeFunction(token);
        }
        return token;
    }
    consumeSimpleBlock(type) {
        const block = { type, values: [] };
        let token = this.consumeToken();
        while (true) {
            if (token.type === 32 /* TokenType.EOF_TOKEN */ || isEndingTokenFor(token, type)) {
                return block;
            }
            this.reconsumeToken(token);
            block.values.push(this.consumeComponentValue());
            token = this.consumeToken();
        }
    }
    consumeFunction(functionToken) {
        const cssFunction = {
            name: functionToken.value,
            values: [],
            type: 18 /* TokenType.FUNCTION */
        };
        while (true) {
            const token = this.consumeToken();
            if (token.type === 32 /* TokenType.EOF_TOKEN */ || token.type === 3 /* TokenType.RIGHT_PARENTHESIS_TOKEN */) {
                return cssFunction;
            }
            this.reconsumeToken(token);
            cssFunction.values.push(this.consumeComponentValue());
        }
    }
    consumeToken() {
        const token = this._tokens.shift();
        return typeof token === 'undefined' ? tokenizer_1.EOF_TOKEN : token;
    }
    reconsumeToken(token) {
        this._tokens.unshift(token);
    }
}
exports.Parser = Parser;
const isDimensionToken = (token) => token.type === 15 /* TokenType.DIMENSION_TOKEN */;
exports.isDimensionToken = isDimensionToken;
const isNumberToken = (token) => token.type === 17 /* TokenType.NUMBER_TOKEN */;
exports.isNumberToken = isNumberToken;
const isIdentToken = (token) => token.type === 20 /* TokenType.IDENT_TOKEN */;
exports.isIdentToken = isIdentToken;
const isStringToken = (token) => token.type === 0 /* TokenType.STRING_TOKEN */;
exports.isStringToken = isStringToken;
const isIdentWithValue = (token, value) => (0, exports.isIdentToken)(token) && token.value === value;
exports.isIdentWithValue = isIdentWithValue;
const nonWhiteSpace = (token) => token.type !== 31 /* TokenType.WHITESPACE_TOKEN */;
exports.nonWhiteSpace = nonWhiteSpace;
const nonFunctionArgSeparator = (token) => token.type !== 31 /* TokenType.WHITESPACE_TOKEN */ && token.type !== 4 /* TokenType.COMMA_TOKEN */;
exports.nonFunctionArgSeparator = nonFunctionArgSeparator;
const parseFunctionArgs = (tokens) => {
    const args = [];
    let arg = [];
    tokens.forEach((token) => {
        if (token.type === 4 /* TokenType.COMMA_TOKEN */) {
            if (arg.length === 0) {
                throw new Error(`Error parsing function args, zero tokens for arg`);
            }
            args.push(arg);
            arg = [];
            return;
        }
        if (token.type !== 31 /* TokenType.WHITESPACE_TOKEN */) {
            arg.push(token);
        }
    });
    if (arg.length) {
        args.push(arg);
    }
    return args;
};
exports.parseFunctionArgs = parseFunctionArgs;
const isEndingTokenFor = (token, type) => {
    if (type === 11 /* TokenType.LEFT_CURLY_BRACKET_TOKEN */ && token.type === 12 /* TokenType.RIGHT_CURLY_BRACKET_TOKEN */) {
        return true;
    }
    if (type === 28 /* TokenType.LEFT_SQUARE_BRACKET_TOKEN */ && token.type === 29 /* TokenType.RIGHT_SQUARE_BRACKET_TOKEN */) {
        return true;
    }
    return type === 2 /* TokenType.LEFT_PARENTHESIS_TOKEN */ && token.type === 3 /* TokenType.RIGHT_PARENTHESIS_TOKEN */;
};
//# sourceMappingURL=parser.js.map