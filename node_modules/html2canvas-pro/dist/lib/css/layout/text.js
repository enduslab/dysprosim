"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segmentGraphemes = exports.parseTextBounds = exports.TextBounds = void 0;
const css_line_break_1 = require("css-line-break");
const text_segmentation_1 = require("text-segmentation");
const bounds_1 = require("./bounds");
const features_1 = require("../../core/features");
class TextBounds {
    constructor(text, bounds) {
        this.text = text;
        this.bounds = bounds;
    }
}
exports.TextBounds = TextBounds;
const parseTextBounds = (context, value, styles, node) => {
    const textList = breakText(value, styles);
    const textBounds = [];
    let offset = 0;
    textList.forEach((text) => {
        if (styles.textDecorationLine.length || text.trim().length > 0) {
            if (features_1.FEATURES.SUPPORT_RANGE_BOUNDS) {
                const clientRects = createRange(node, offset, text.length).getClientRects();
                if (clientRects.length > 1) {
                    const subSegments = (0, exports.segmentGraphemes)(text);
                    let subOffset = 0;
                    subSegments.forEach((subSegment) => {
                        textBounds.push(new TextBounds(subSegment, bounds_1.Bounds.fromDOMRectList(context, createRange(node, subOffset + offset, subSegment.length).getClientRects())));
                        subOffset += subSegment.length;
                    });
                }
                else {
                    textBounds.push(new TextBounds(text, bounds_1.Bounds.fromDOMRectList(context, clientRects)));
                }
            }
            else {
                const replacementNode = node.splitText(text.length);
                textBounds.push(new TextBounds(text, getWrapperBounds(context, node)));
                node = replacementNode;
            }
        }
        else if (!features_1.FEATURES.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    });
    return textBounds;
};
exports.parseTextBounds = parseTextBounds;
const getWrapperBounds = (context, node) => {
    const ownerDocument = node.ownerDocument;
    if (ownerDocument) {
        const wrapper = ownerDocument.createElement('html2canvaswrapper');
        wrapper.appendChild(node.cloneNode(true));
        const parentNode = node.parentNode;
        if (parentNode) {
            parentNode.replaceChild(wrapper, node);
            const bounds = (0, bounds_1.parseBounds)(context, wrapper);
            if (wrapper.firstChild) {
                parentNode.replaceChild(wrapper.firstChild, wrapper);
            }
            return bounds;
        }
    }
    return bounds_1.Bounds.EMPTY;
};
const createRange = (node, offset, length) => {
    const ownerDocument = node.ownerDocument;
    if (!ownerDocument) {
        throw new Error('Node has no owner document');
    }
    const range = ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return range;
};
const segmentGraphemes = (value) => {
    if (features_1.FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
        const segmenter = new Intl.Segmenter(void 0, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(value)).map((segment) => segment.segment);
    }
    return (0, text_segmentation_1.splitGraphemes)(value);
};
exports.segmentGraphemes = segmentGraphemes;
const segmentWords = (value, styles) => {
    if (features_1.FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
        const segmenter = new Intl.Segmenter(void 0, {
            granularity: 'word'
        });
        return Array.from(segmenter.segment(value)).map((segment) => segment.segment);
    }
    return breakWords(value, styles);
};
const breakText = (value, styles) => {
    return styles.letterSpacing !== 0 ? (0, exports.segmentGraphemes)(value) : segmentWords(value, styles);
};
// https://drafts.csswg.org/css-text/#word-separator
const wordSeparators = [0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091];
const breakWords = (str, styles) => {
    const breaker = (0, css_line_break_1.LineBreaker)(str, {
        lineBreak: styles.lineBreak,
        wordBreak: styles.overflowWrap === "break-word" /* OVERFLOW_WRAP.BREAK_WORD */ ? 'break-word' : styles.wordBreak
    });
    const words = [];
    let bk;
    while (!(bk = breaker.next()).done) {
        if (bk.value) {
            const value = bk.value.slice();
            const codePoints = (0, css_line_break_1.toCodePoints)(value);
            let word = '';
            codePoints.forEach((codePoint) => {
                if (wordSeparators.indexOf(codePoint) === -1) {
                    word += (0, css_line_break_1.fromCodePoint)(codePoint);
                }
                else {
                    if (word.length) {
                        words.push(word);
                    }
                    words.push((0, css_line_break_1.fromCodePoint)(codePoint));
                    word = '';
                }
            });
            if (word.length) {
                words.push(word);
            }
        }
    }
    return words;
};
//# sourceMappingURL=text.js.map