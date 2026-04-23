import { Bounds } from '../css/layout/bounds';
import { Context } from '../core/context';
export interface CloneOptions {
    ignoreElements?: (element: Element) => boolean;
    onclone?: (document: Document, element: HTMLElement) => void;
    allowTaint?: boolean;
    iframeContainer?: HTMLElement | ShadowRoot;
}
export interface WindowOptions {
    scrollX: number;
    scrollY: number;
    windowWidth: number;
    windowHeight: number;
}
export type CloneConfigurations = CloneOptions & {
    inlineImages: boolean;
    copyStyles: boolean;
    cspNonce?: string;
};
export declare class DocumentCloner {
    private readonly context;
    private readonly options;
    private readonly scrolledElements;
    private readonly referenceElement;
    clonedReferenceElement?: HTMLElement;
    private readonly documentElement;
    private readonly counters;
    private quoteDepth;
    constructor(context: Context, element: HTMLElement, options: CloneConfigurations);
    toIFrame(ownerDocument: Document, windowSize: Bounds): Promise<HTMLIFrameElement>;
    createElementClone<T extends HTMLElement | SVGElement>(node: T): HTMLElement | SVGElement;
    createCustomElementClone(node: HTMLElement): HTMLElement;
    createStyleClone(node: HTMLStyleElement): HTMLStyleElement;
    createCanvasClone(canvas: HTMLCanvasElement): HTMLImageElement | HTMLCanvasElement;
    createVideoClone(video: HTMLVideoElement): HTMLCanvasElement;
    appendChildNode(clone: HTMLElement | SVGElement, child: Node, copyStyles: boolean): void;
    /**
     * Check if a child node should be cloned based on filtering rules
     * Filters out: scripts, ignored elements, and optionally styles
     */
    private shouldCloneChild;
    /**
     * Check if a style element should be cloned based on copyStyles option
     */
    private shouldCloneStyleElement;
    /**
     * Safely append a cloned child to a target, applying all filtering rules
     */
    private safeAppendClonedChild;
    /**
     * Clone assigned nodes from a slot element to the target
     */
    private cloneAssignedNodes;
    /**
     * Clone fallback content from a slot element when no nodes are assigned
     */
    private cloneSlotFallbackContent;
    /**
     * Handle cloning of a slot element, including assigned nodes or fallback content
     */
    private cloneSlotElement;
    /**
     * Clone shadow DOM children to the target shadow root
     */
    private cloneShadowDOMChildren;
    /**
     * Clone light DOM children to the target element
     */
    private cloneLightDOMChildren;
    /**
     * Clone slot element as light DOM when shadow root creation failed
     */
    private cloneSlotElementAsLightDOM;
    /**
     * Clone shadow DOM content as light DOM when shadow root creation failed
     * This is a fallback mechanism to ensure content is not lost
     */
    private cloneShadowDOMAsLightDOM;
    /**
     * Clone child nodes from source element to clone element
     * Handles shadow DOM, slots, and light DOM appropriately
     */
    cloneChildNodes(node: Element, clone: HTMLElement | SVGElement, copyStyles: boolean): void;
    cloneNode(node: Node, copyStyles: boolean): Node;
    resolvePseudoContent(node: Element, clone: Element, style: CSSStyleDeclaration, pseudoElt: PseudoElementType): HTMLElement | void;
    static destroy(container: HTMLIFrameElement): boolean;
}
declare enum PseudoElementType {
    BEFORE = 0,
    AFTER = 1
}
export declare const copyCSSStyles: <T extends HTMLElement | SVGElement>(style: CSSStyleDeclaration, target: T) => T;
export {};
