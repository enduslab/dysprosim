"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duration = void 0;
const parser_1 = require("../syntax/parser");
const time_1 = require("../types/time");
exports.duration = {
    name: 'duration',
    initialValue: '0s',
    prefix: false,
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    parse: (context, tokens) => {
        return tokens.filter(parser_1.isDimensionToken).map((token) => time_1.time.parse(context, token));
    }
};
//# sourceMappingURL=duration.js.map