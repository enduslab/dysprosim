"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuote = exports.quotes = void 0;
const parser_1 = require("../syntax/parser");
exports.quotes = {
    name: 'quotes',
    initialValue: 'none',
    prefix: true,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (_context, tokens) => {
        if (tokens.length === 0) {
            return null;
        }
        const first = tokens[0];
        if (first.type === 20 /* TokenType.IDENT_TOKEN */ && first.value === 'none') {
            return null;
        }
        const quotes = [];
        const filtered = tokens.filter(parser_1.isStringToken);
        if (filtered.length % 2 !== 0) {
            return null;
        }
        for (let i = 0; i < filtered.length; i += 2) {
            const open = filtered[i].value;
            const close = filtered[i + 1].value;
            quotes.push({ open, close });
        }
        return quotes;
    }
};
const getQuote = (quotes, depth, open) => {
    if (!quotes) {
        return '';
    }
    const quote = quotes[Math.min(depth, quotes.length - 1)];
    if (!quote) {
        return '';
    }
    return open ? quote.open : quote.close;
};
exports.getQuote = getQuote;
//# sourceMappingURL=quotes.js.map