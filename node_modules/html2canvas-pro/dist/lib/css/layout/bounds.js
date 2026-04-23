"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocumentSize = exports.parseBounds = exports.Bounds = void 0;
class Bounds {
    constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
    add(x, y, w, h) {
        return new Bounds(this.left + x, this.top + y, this.width + w, this.height + h);
    }
    static fromClientRect(context, clientRect) {
        return new Bounds(clientRect.left + context.windowBounds.left, clientRect.top + context.windowBounds.top, clientRect.width, clientRect.height);
    }
    static fromDOMRectList(context, domRectList) {
        const rects = Array.from(domRectList);
        // First try to find a rect with non-zero width
        let domRect = rects.find((rect) => rect.width !== 0);
        // If not found, try to find a rect with non-zero height
        // This handles cases like inline-flex with single child where width might be 0
        if (!domRect) {
            domRect = rects.find((rect) => rect.height !== 0);
        }
        // If still not found but rects exist, use the first rect
        // Position info (left, top) might still be valid even if dimensions are 0
        if (!domRect && rects.length > 0) {
            domRect = rects[0];
        }
        return domRect
            ? new Bounds(domRect.left + context.windowBounds.left, domRect.top + context.windowBounds.top, domRect.width, domRect.height)
            : Bounds.EMPTY;
    }
}
exports.Bounds = Bounds;
Bounds.EMPTY = new Bounds(0, 0, 0, 0);
const parseBounds = (context, node) => {
    return Bounds.fromClientRect(context, node.getBoundingClientRect());
};
exports.parseBounds = parseBounds;
const parseDocumentSize = (document) => {
    const body = document.body;
    const documentElement = document.documentElement;
    if (!body || !documentElement) {
        throw new Error(`Unable to get document size`);
    }
    const width = Math.max(Math.max(body.scrollWidth, documentElement.scrollWidth), Math.max(body.offsetWidth, documentElement.offsetWidth), Math.max(body.clientWidth, documentElement.clientWidth));
    const height = Math.max(Math.max(body.scrollHeight, documentElement.scrollHeight), Math.max(body.offsetHeight, documentElement.offsetHeight), Math.max(body.clientHeight, documentElement.clientHeight));
    return new Bounds(0, 0, width, height);
};
exports.parseDocumentSize = parseDocumentSize;
//# sourceMappingURL=bounds.js.map