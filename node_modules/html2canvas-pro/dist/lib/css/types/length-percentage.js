"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbsoluteValue = exports.getAbsoluteValueForTuple = exports.HUNDRED_PERCENT = exports.FIFTY_PERCENT = exports.ZERO_LENGTH = exports.parseLengthPercentageTuple = exports.evaluateCalcToLengthPercentage = exports.isCalcFunction = exports.isLengthPercentage = void 0;
const tokenizer_1 = require("../syntax/tokenizer");
const parser_1 = require("../syntax/parser");
const length_1 = require("./length");
const isLengthPercentage = (token) => token.type === 16 /* TokenType.PERCENTAGE_TOKEN */ || (0, length_1.isLength)(token);
exports.isLengthPercentage = isLengthPercentage;
/**
 * Check if a token is a calc() function
 */
const isCalcFunction = (token) => token.type === 18 /* TokenType.FUNCTION */ && token.name === 'calc';
exports.isCalcFunction = isCalcFunction;
/**
 * Evaluate a calc() expression and convert to LengthPercentage token
 * Supports basic arithmetic: +, -, *, /
 * Note: Percentages in calc() are converted based on a context value
 */
const evaluateCalcToLengthPercentage = (calcToken, contextValue = 0) => {
    // Build expression string from tokens
    const buildExpression = (values) => {
        let expression = '';
        for (const value of values) {
            if (value.type === 31 /* TokenType.WHITESPACE_TOKEN */) {
                continue;
            }
            if (value.type === 18 /* TokenType.FUNCTION */) {
                if (value.name === 'calc') {
                    const nested = buildExpression(value.values);
                    if (nested === null)
                        return null;
                    expression += `(${nested})`;
                }
                else {
                    return null;
                }
            }
            else if (value.type === 17 /* TokenType.NUMBER_TOKEN */) {
                expression += value.number.toString();
            }
            else if (value.type === 15 /* TokenType.DIMENSION_TOKEN */) {
                // Convert units to px
                if (value.unit === 'px') {
                    expression += value.number.toString();
                }
                else if (value.unit === 'rem' || value.unit === 'em') {
                    expression += (value.number * 16).toString();
                }
                else {
                    expression += value.number.toString();
                }
            }
            else if (value.type === 16 /* TokenType.PERCENTAGE_TOKEN */) {
                // Convert percentage to absolute value based on context
                expression += ((value.number / 100) * contextValue).toString();
            }
            else if (value.type === 6 /* TokenType.DELIM_TOKEN */) {
                const op = value.value;
                if (op === '+' || op === '-' || op === '*' || op === '/') {
                    expression += ` ${op} `;
                }
                else if (op === '(') {
                    expression += '(';
                }
                else if (op === ')') {
                    expression += ')';
                }
            }
        }
        return expression;
    };
    try {
        const expression = buildExpression(calcToken.values);
        if (expression === null || expression.trim() === '') {
            return null;
        }
        // Evaluate the expression
        // Note: Using Function constructor (similar to color.ts line 185)
        const result = new Function('return ' + expression)();
        if (typeof result === 'number' && !isNaN(result)) {
            // Return as a number token in px
            return {
                type: 17 /* TokenType.NUMBER_TOKEN */,
                number: result,
                flags: tokenizer_1.FLAG_INTEGER
            };
        }
    }
    catch (e) {
        return null;
    }
    return null;
};
exports.evaluateCalcToLengthPercentage = evaluateCalcToLengthPercentage;
const parseLengthPercentageTuple = (tokens) => tokens.length > 1 ? [tokens[0], tokens[1]] : [tokens[0]];
exports.parseLengthPercentageTuple = parseLengthPercentageTuple;
exports.ZERO_LENGTH = {
    type: 17 /* TokenType.NUMBER_TOKEN */,
    number: 0,
    flags: tokenizer_1.FLAG_INTEGER
};
exports.FIFTY_PERCENT = {
    type: 16 /* TokenType.PERCENTAGE_TOKEN */,
    number: 50,
    flags: tokenizer_1.FLAG_INTEGER
};
exports.HUNDRED_PERCENT = {
    type: 16 /* TokenType.PERCENTAGE_TOKEN */,
    number: 100,
    flags: tokenizer_1.FLAG_INTEGER
};
const getAbsoluteValueForTuple = (tuple, width, height) => {
    const [x, y] = tuple;
    return [(0, exports.getAbsoluteValue)(x, width), (0, exports.getAbsoluteValue)(typeof y !== 'undefined' ? y : x, height)];
};
exports.getAbsoluteValueForTuple = getAbsoluteValueForTuple;
const getAbsoluteValue = (token, parent) => {
    if (token.type === 16 /* TokenType.PERCENTAGE_TOKEN */) {
        return (token.number / 100) * parent;
    }
    if ((0, parser_1.isDimensionToken)(token)) {
        switch (token.unit) {
            case 'rem':
            case 'em':
                return 16 * token.number; // TODO use correct font-size
            case 'px':
            default:
                return token.number;
        }
    }
    return token.number;
};
exports.getAbsoluteValue = getAbsoluteValue;
//# sourceMappingURL=length-percentage.js.map