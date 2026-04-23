"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRadius = exports.calculateGradientDirection = exports.processColorStops = exports.parseColorStop = void 0;
const color_1 = require("../color");
const length_percentage_1 = require("../length-percentage");
const parseColorStop = (context, args) => {
    const color = color_1.color.parse(context, args[0]);
    const stop = args[1];
    return stop && (0, length_percentage_1.isLengthPercentage)(stop) ? { color, stop } : { color, stop: null };
};
exports.parseColorStop = parseColorStop;
const processColorStops = (stops, lineLength) => {
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (first.stop === null) {
        first.stop = length_percentage_1.ZERO_LENGTH;
    }
    if (last.stop === null) {
        last.stop = length_percentage_1.HUNDRED_PERCENT;
    }
    const processStops = [];
    let previous = 0;
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i].stop;
        if (stop !== null) {
            const absoluteValue = (0, length_percentage_1.getAbsoluteValue)(stop, lineLength);
            if (absoluteValue > previous) {
                processStops.push(absoluteValue);
            }
            else {
                processStops.push(previous);
            }
            previous = absoluteValue;
        }
        else {
            processStops.push(null);
        }
    }
    let gapBegin = null;
    for (let i = 0; i < processStops.length; i++) {
        const stop = processStops[i];
        if (stop === null) {
            if (gapBegin === null) {
                gapBegin = i;
            }
        }
        else if (gapBegin !== null) {
            const gapLength = i - gapBegin;
            const beforeGap = processStops[gapBegin - 1];
            const gapValue = (stop - beforeGap) / (gapLength + 1);
            for (let g = 1; g <= gapLength; g++) {
                processStops[gapBegin + g - 1] = gapValue * g;
            }
            gapBegin = null;
        }
    }
    return stops.map(({ color }, i) => {
        return { color, stop: Math.max(Math.min(1, processStops[i] / lineLength), 0) };
    });
};
exports.processColorStops = processColorStops;
const getAngleFromCorner = (corner, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const x = (0, length_percentage_1.getAbsoluteValue)(corner[0], width) - centerX;
    const y = centerY - (0, length_percentage_1.getAbsoluteValue)(corner[1], height);
    return (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
};
const calculateGradientDirection = (angle, width, height) => {
    const radian = typeof angle === 'number' ? angle : getAngleFromCorner(angle, width, height);
    const lineLength = Math.abs(width * Math.sin(radian)) + Math.abs(height * Math.cos(radian));
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfLineLength = lineLength / 2;
    const yDiff = Math.sin(radian - Math.PI / 2) * halfLineLength;
    const xDiff = Math.cos(radian - Math.PI / 2) * halfLineLength;
    return [lineLength, halfWidth - xDiff, halfWidth + xDiff, halfHeight - yDiff, halfHeight + yDiff];
};
exports.calculateGradientDirection = calculateGradientDirection;
const distance = (a, b) => Math.sqrt(a * a + b * b);
const findCorner = (width, height, x, y, closest) => {
    const corners = [
        [0, 0],
        [0, height],
        [width, 0],
        [width, height]
    ];
    return corners.reduce((stat, corner) => {
        const [cx, cy] = corner;
        const d = distance(x - cx, y - cy);
        if (closest ? d < stat.optimumDistance : d > stat.optimumDistance) {
            return {
                optimumCorner: corner,
                optimumDistance: d
            };
        }
        return stat;
    }, {
        optimumDistance: closest ? Infinity : -Infinity,
        optimumCorner: null
    }).optimumCorner;
};
const calculateRadius = (gradient, x, y, width, height) => {
    let rx = 0;
    let ry = 0;
    switch (gradient.size) {
        case 0 /* CSSRadialExtent.CLOSEST_SIDE */:
            // The ending shape is sized so that that it exactly meets the side of the gradient box closest to the gradient’s center.
            // If the shape is an ellipse, it exactly meets the closest side in each dimension.
            if (gradient.shape === 0 /* CSSRadialShape.CIRCLE */) {
                rx = ry = Math.min(Math.abs(x), Math.abs(x - width), Math.abs(y), Math.abs(y - height));
            }
            else if (gradient.shape === 1 /* CSSRadialShape.ELLIPSE */) {
                rx = Math.min(Math.abs(x), Math.abs(x - width));
                ry = Math.min(Math.abs(y), Math.abs(y - height));
            }
            break;
        case 2 /* CSSRadialExtent.CLOSEST_CORNER */:
            // The ending shape is sized so that that it passes through the corner of the gradient box closest to the gradient’s center.
            // If the shape is an ellipse, the ending shape is given the same aspect-ratio it would have if closest-side were specified.
            if (gradient.shape === 0 /* CSSRadialShape.CIRCLE */) {
                rx = ry = Math.min(distance(x, y), distance(x, y - height), distance(x - width, y), distance(x - width, y - height));
            }
            else if (gradient.shape === 1 /* CSSRadialShape.ELLIPSE */) {
                // Compute the ratio ry/rx (which is to be the same as for "closest-side")
                const c = Math.min(Math.abs(y), Math.abs(y - height)) / Math.min(Math.abs(x), Math.abs(x - width));
                const [cx, cy] = findCorner(width, height, x, y, true);
                rx = distance(cx - x, (cy - y) / c);
                ry = c * rx;
            }
            break;
        case 1 /* CSSRadialExtent.FARTHEST_SIDE */:
            // Same as closest-side, except the ending shape is sized based on the farthest side(s)
            if (gradient.shape === 0 /* CSSRadialShape.CIRCLE */) {
                rx = ry = Math.max(Math.abs(x), Math.abs(x - width), Math.abs(y), Math.abs(y - height));
            }
            else if (gradient.shape === 1 /* CSSRadialShape.ELLIPSE */) {
                rx = Math.max(Math.abs(x), Math.abs(x - width));
                ry = Math.max(Math.abs(y), Math.abs(y - height));
            }
            break;
        case 3 /* CSSRadialExtent.FARTHEST_CORNER */:
            // Same as closest-corner, except the ending shape is sized based on the farthest corner.
            // If the shape is an ellipse, the ending shape is given the same aspect ratio it would have if farthest-side were specified.
            if (gradient.shape === 0 /* CSSRadialShape.CIRCLE */) {
                rx = ry = Math.max(distance(x, y), distance(x, y - height), distance(x - width, y), distance(x - width, y - height));
            }
            else if (gradient.shape === 1 /* CSSRadialShape.ELLIPSE */) {
                // Compute the ratio ry/rx (which is to be the same as for "farthest-side")
                const c = Math.max(Math.abs(y), Math.abs(y - height)) / Math.max(Math.abs(x), Math.abs(x - width));
                const [cx, cy] = findCorner(width, height, x, y, false);
                rx = distance(cx - x, (cy - y) / c);
                ry = c * rx;
            }
            break;
    }
    if (Array.isArray(gradient.size)) {
        rx = (0, length_percentage_1.getAbsoluteValue)(gradient.size[0], width);
        ry = gradient.size.length === 2 ? (0, length_percentage_1.getAbsoluteValue)(gradient.size[1], height) : rx;
    }
    return [rx, ry];
};
exports.calculateRadius = calculateRadius;
//# sourceMappingURL=gradient.js.map