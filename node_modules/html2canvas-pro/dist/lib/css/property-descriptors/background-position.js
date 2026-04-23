"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundPosition = void 0;
const parser_1 = require("../syntax/parser");
const length_percentage_1 = require("../types/length-percentage");
exports.backgroundPosition = {
    name: 'background-position',
    initialValue: '0% 0%',
    type: 1 /* PropertyDescriptorParsingType.LIST */,
    prefix: false,
    parse: (_context, tokens) => {
        return (0, parser_1.parseFunctionArgs)(tokens)
            .map((values) => {
            // Convert calc() to length-percentage tokens, keep other length-percentage as is
            return values
                .map((value) => {
                if ((0, length_percentage_1.isCalcFunction)(value)) {
                    // For calc() at parse time, we can't know the container size
                    // So we evaluate with 0 context which will work for px-only calc()
                    // Percentage-based calc() will need special handling
                    return (0, length_percentage_1.evaluateCalcToLengthPercentage)(value, 0);
                }
                return (0, length_percentage_1.isLengthPercentage)(value) ? value : null;
            })
                .filter((v) => v !== null);
        })
            .map(length_percentage_1.parseLengthPercentageTuple);
    }
};
//# sourceMappingURL=background-position.js.map