/**
 * DOM Normalizer
 * Handles DOM side effects that need to happen before rendering
 * Extracted from ElementContainer to follow SRP
 */
import { CSSParsedDeclaration } from '../css';
/**
 * Stored original styles for restoration
 */
export interface OriginalStyles {
    animationDuration?: string;
    transform?: string;
    rotate?: string;
}
/**
 * Normalize element styles for accurate rendering
 * This includes disabling animations and neutralizing transforms.
 */
export declare class DOMNormalizer {
    /**
     * Normalize a single element and return original styles.
     *
     * ## Why we replace transforms with an identity value instead of "none"
     *
     * `getBoundingClientRect()` returns visual (post-transform) coordinates, so we
     * must neutralize any active transform before measuring element bounds.
     *
     * The naive approach of setting `transform: none` (or `rotate: none`) has a
     * critical side-effect: per **CSS Transforms Level 2**, an element whose
     * `transform` is non-none automatically becomes the **containing block** for
     * all of its `position: absolute` *and* `position: fixed` descendants.
     * Setting it to `none` destroys that role, causing children to resolve their
     * percentage dimensions and offsets against an unintended ancestor — which
     * produces completely wrong bounds.
     *
     * Solution: instead of removing the transform, we replace it with a visually
     * inert identity value:
     *
     * - `transform: scale(0.5)` → `transform: translate(0, 0)`
     *   - `translate(0, 0)` is an identity transform (no visual change, no layout shift).
     *   - `getBoundingClientRect()` returns the same layout-space coordinates as
     *     if there were no transform at all.
     *   - Because the value is still non-none, the element **remains a containing
     *     block** for both `position: absolute` and `position: fixed` descendants.
     *
     * - `rotate: 45deg` → `rotate: 0deg`
     *   - `0deg` is the identity rotation; `0deg ≠ none`, so the same containing-
     *     block guarantee holds.
     *
     * @param element - Element to normalize
     * @param styles - Parsed CSS styles
     * @returns Original styles map for restoration
     */
    static normalizeElement(element: Element, styles: CSSParsedDeclaration): OriginalStyles;
    /**
     * Restore element styles after rendering.
     *
     * @param element - Element to restore
     * @param originalStyles - Original styles to restore
     */
    static restoreElement(element: Element, originalStyles: OriginalStyles): void;
}
