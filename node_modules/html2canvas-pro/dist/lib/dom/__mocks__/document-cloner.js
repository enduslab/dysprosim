"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCloner = void 0;
class DocumentCloner {
    constructor() {
        this.clonedReferenceElement = {
            ownerDocument: {
                defaultView: {
                    pageXOffset: 12,
                    pageYOffset: 34
                }
            }
        };
    }
    toIFrame() {
        return Promise.resolve({});
    }
    static destroy() {
        return true;
    }
}
exports.DocumentCloner = DocumentCloner;
//# sourceMappingURL=document-cloner.js.map