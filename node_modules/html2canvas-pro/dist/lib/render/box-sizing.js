"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentBox = exports.paddingBox = void 0;
const length_percentage_1 = require("../css/types/length-percentage");
const paddingBox = (element) => {
    const bounds = element.bounds;
    const styles = element.styles;
    return bounds.add(styles.borderLeftWidth, styles.borderTopWidth, -(styles.borderRightWidth + styles.borderLeftWidth), -(styles.borderTopWidth + styles.borderBottomWidth));
};
exports.paddingBox = paddingBox;
const contentBox = (element) => {
    const styles = element.styles;
    const bounds = element.bounds;
    const paddingLeft = (0, length_percentage_1.getAbsoluteValue)(styles.paddingLeft, bounds.width);
    const paddingRight = (0, length_percentage_1.getAbsoluteValue)(styles.paddingRight, bounds.width);
    const paddingTop = (0, length_percentage_1.getAbsoluteValue)(styles.paddingTop, bounds.width);
    const paddingBottom = (0, length_percentage_1.getAbsoluteValue)(styles.paddingBottom, bounds.width);
    return bounds.add(paddingLeft + styles.borderLeftWidth, paddingTop + styles.borderTopWidth, -(styles.borderRightWidth + styles.borderLeftWidth + paddingLeft + paddingRight), -(styles.borderTopWidth + styles.borderBottomWidth + paddingTop + paddingBottom));
};
exports.contentBox = contentBox;
//# sourceMappingURL=box-sizing.js.map