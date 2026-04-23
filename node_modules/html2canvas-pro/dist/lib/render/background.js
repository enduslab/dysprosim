"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBackgroundRepeatPath = exports.getBackgroundValueForIndex = exports.calculateBackgroundSize = exports.isAuto = exports.calculateBackgroundRendering = exports.calculateBackgroundPaintingArea = exports.calculateBackgroundPositioningArea = void 0;
const background_size_1 = require("../css/property-descriptors/background-size");
const vector_1 = require("./vector");
const length_percentage_1 = require("../css/types/length-percentage");
const parser_1 = require("../css/syntax/parser");
const box_sizing_1 = require("./box-sizing");
const calculateBackgroundPositioningArea = (backgroundOrigin, element) => {
    if (backgroundOrigin === 0 /* BACKGROUND_ORIGIN.BORDER_BOX */) {
        return element.bounds;
    }
    if (backgroundOrigin === 2 /* BACKGROUND_ORIGIN.CONTENT_BOX */) {
        return (0, box_sizing_1.contentBox)(element);
    }
    return (0, box_sizing_1.paddingBox)(element);
};
exports.calculateBackgroundPositioningArea = calculateBackgroundPositioningArea;
const calculateBackgroundPaintingArea = (backgroundClip, element) => {
    if (backgroundClip === 0 /* BACKGROUND_CLIP.BORDER_BOX */) {
        return element.bounds;
    }
    if (backgroundClip === 2 /* BACKGROUND_CLIP.CONTENT_BOX */) {
        return (0, box_sizing_1.contentBox)(element);
    }
    return (0, box_sizing_1.paddingBox)(element);
};
exports.calculateBackgroundPaintingArea = calculateBackgroundPaintingArea;
const calculateBackgroundRendering = (container, index, intrinsicSize) => {
    const backgroundPositioningArea = (0, exports.calculateBackgroundPositioningArea)((0, exports.getBackgroundValueForIndex)(container.styles.backgroundOrigin, index), container);
    const backgroundPaintingArea = (0, exports.calculateBackgroundPaintingArea)((0, exports.getBackgroundValueForIndex)(container.styles.backgroundClip, index), container);
    const backgroundImageSize = (0, exports.calculateBackgroundSize)((0, exports.getBackgroundValueForIndex)(container.styles.backgroundSize, index), intrinsicSize, backgroundPositioningArea);
    let [sizeWidth, sizeHeight] = backgroundImageSize;
    const position = (0, length_percentage_1.getAbsoluteValueForTuple)((0, exports.getBackgroundValueForIndex)(container.styles.backgroundPosition, index), backgroundPositioningArea.width - sizeWidth, backgroundPositioningArea.height - sizeHeight);
    const path = (0, exports.calculateBackgroundRepeatPath)((0, exports.getBackgroundValueForIndex)(container.styles.backgroundRepeat, index), position, backgroundImageSize, backgroundPositioningArea, backgroundPaintingArea);
    const offsetX = Math.round(backgroundPositioningArea.left + position[0]);
    const offsetY = Math.round(backgroundPositioningArea.top + position[1]);
    sizeWidth = Math.max(1, sizeWidth);
    sizeHeight = Math.max(1, sizeHeight);
    return [path, offsetX, offsetY, sizeWidth, sizeHeight];
};
exports.calculateBackgroundRendering = calculateBackgroundRendering;
const isAuto = (token) => (0, parser_1.isIdentToken)(token) && token.value === background_size_1.BACKGROUND_SIZE.AUTO;
exports.isAuto = isAuto;
const hasIntrinsicValue = (value) => typeof value === 'number';
const calculateBackgroundSize = (size, [intrinsicWidth, intrinsicHeight, intrinsicProportion], bounds) => {
    const [first, second] = size;
    if (!first) {
        return [0, 0];
    }
    if ((0, length_percentage_1.isLengthPercentage)(first) && second && (0, length_percentage_1.isLengthPercentage)(second)) {
        return [(0, length_percentage_1.getAbsoluteValue)(first, bounds.width), (0, length_percentage_1.getAbsoluteValue)(second, bounds.height)];
    }
    const hasIntrinsicProportion = hasIntrinsicValue(intrinsicProportion);
    if ((0, parser_1.isIdentToken)(first) && (first.value === background_size_1.BACKGROUND_SIZE.CONTAIN || first.value === background_size_1.BACKGROUND_SIZE.COVER)) {
        if (hasIntrinsicValue(intrinsicProportion)) {
            const targetRatio = bounds.width / bounds.height;
            return targetRatio < intrinsicProportion !== (first.value === background_size_1.BACKGROUND_SIZE.COVER)
                ? [bounds.width, bounds.width / intrinsicProportion]
                : [bounds.height * intrinsicProportion, bounds.height];
        }
        return [bounds.width, bounds.height];
    }
    const hasIntrinsicWidth = hasIntrinsicValue(intrinsicWidth);
    const hasIntrinsicHeight = hasIntrinsicValue(intrinsicHeight);
    const hasIntrinsicDimensions = hasIntrinsicWidth || hasIntrinsicHeight;
    // If the background-size is auto or auto auto:
    if ((0, exports.isAuto)(first) && (!second || (0, exports.isAuto)(second))) {
        // If the image has both horizontal and vertical intrinsic dimensions, it's rendered at that size.
        if (hasIntrinsicWidth && hasIntrinsicHeight) {
            return [intrinsicWidth, intrinsicHeight];
        }
        // If the image has no intrinsic dimensions and has no intrinsic proportions,
        // it's rendered at the size of the background positioning area.
        if (!hasIntrinsicProportion && !hasIntrinsicDimensions) {
            return [bounds.width, bounds.height];
        }
        // TODO If the image has no intrinsic dimensions but has intrinsic proportions, it's rendered as if contain had been specified instead.
        // If the image has only one intrinsic dimension and has intrinsic proportions, it's rendered at the size corresponding to that one dimension.
        // The other dimension is computed using the specified dimension and the intrinsic proportions.
        if (hasIntrinsicDimensions && hasIntrinsicProportion) {
            const width = hasIntrinsicWidth
                ? intrinsicWidth
                : intrinsicHeight * intrinsicProportion;
            const height = hasIntrinsicHeight
                ? intrinsicHeight
                : intrinsicWidth / intrinsicProportion;
            return [width, height];
        }
        // If the image has only one intrinsic dimension but has no intrinsic proportions,
        // it's rendered using the specified dimension and the other dimension of the background positioning area.
        const width = hasIntrinsicWidth ? intrinsicWidth : bounds.width;
        const height = hasIntrinsicHeight ? intrinsicHeight : bounds.height;
        return [width, height];
    }
    // If the image has intrinsic proportions, it's stretched to the specified dimension.
    // The unspecified dimension is computed using the specified dimension and the intrinsic proportions.
    if (hasIntrinsicProportion) {
        let width = 0;
        let height = 0;
        if ((0, length_percentage_1.isLengthPercentage)(first)) {
            width = (0, length_percentage_1.getAbsoluteValue)(first, bounds.width);
        }
        else if ((0, length_percentage_1.isLengthPercentage)(second)) {
            height = (0, length_percentage_1.getAbsoluteValue)(second, bounds.height);
        }
        if ((0, exports.isAuto)(first)) {
            width = height * intrinsicProportion;
        }
        else if (!second || (0, exports.isAuto)(second)) {
            height = width / intrinsicProportion;
        }
        return [width, height];
    }
    // If the image has no intrinsic proportions, it's stretched to the specified dimension.
    // The unspecified dimension is computed using the image's corresponding intrinsic dimension,
    // if there is one. If there is no such intrinsic dimension,
    // it becomes the corresponding dimension of the background positioning area.
    let width = null;
    let height = null;
    if ((0, length_percentage_1.isLengthPercentage)(first)) {
        width = (0, length_percentage_1.getAbsoluteValue)(first, bounds.width);
    }
    else if (second && (0, length_percentage_1.isLengthPercentage)(second)) {
        height = (0, length_percentage_1.getAbsoluteValue)(second, bounds.height);
    }
    if (width !== null && (!second || (0, exports.isAuto)(second))) {
        height =
            hasIntrinsicWidth && hasIntrinsicHeight
                ? (width / intrinsicWidth) * intrinsicHeight
                : bounds.height;
    }
    if (height !== null && (0, exports.isAuto)(first)) {
        width =
            hasIntrinsicWidth && hasIntrinsicHeight
                ? (height / intrinsicHeight) * intrinsicWidth
                : bounds.width;
    }
    if (width !== null && height !== null) {
        return [width, height];
    }
    throw new Error(`Unable to calculate background-size for element`);
};
exports.calculateBackgroundSize = calculateBackgroundSize;
const getBackgroundValueForIndex = (values, index) => {
    const value = values[index];
    if (typeof value === 'undefined') {
        return values[0];
    }
    return value;
};
exports.getBackgroundValueForIndex = getBackgroundValueForIndex;
const calculateBackgroundRepeatPath = (repeat, [x, y], [width, height], backgroundPositioningArea, backgroundPaintingArea) => {
    switch (repeat) {
        case 2 /* BACKGROUND_REPEAT.REPEAT_X */:
            return [
                new vector_1.Vector(Math.round(backgroundPositioningArea.left), Math.round(backgroundPositioningArea.top + y)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + backgroundPositioningArea.width), Math.round(backgroundPositioningArea.top + y)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + backgroundPositioningArea.width), Math.round(height + backgroundPositioningArea.top + y)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left), Math.round(height + backgroundPositioningArea.top + y))
            ];
        case 3 /* BACKGROUND_REPEAT.REPEAT_Y */:
            return [
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.height + backgroundPositioningArea.top)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.height + backgroundPositioningArea.top))
            ];
        case 1 /* BACKGROUND_REPEAT.NO_REPEAT */:
            return [
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top + y)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top + y)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top + y + height)),
                new vector_1.Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top + y + height))
            ];
        default:
            return [
                new vector_1.Vector(Math.round(backgroundPaintingArea.left), Math.round(backgroundPaintingArea.top)),
                new vector_1.Vector(Math.round(backgroundPaintingArea.left + backgroundPaintingArea.width), Math.round(backgroundPaintingArea.top)),
                new vector_1.Vector(Math.round(backgroundPaintingArea.left + backgroundPaintingArea.width), Math.round(backgroundPaintingArea.height + backgroundPaintingArea.top)),
                new vector_1.Vector(Math.round(backgroundPaintingArea.left), Math.round(backgroundPaintingArea.height + backgroundPaintingArea.top))
            ];
    }
};
exports.calculateBackgroundRepeatPath = calculateBackgroundRepeatPath;
//# sourceMappingURL=background.js.map