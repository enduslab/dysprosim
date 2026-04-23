/**
 * Border Renderer
 *
 * Handles rendering of element borders including:
 * - Solid borders
 * - Double borders
 * - Dashed borders
 * - Dotted borders
 */
import { Color } from '../../css/types/color';
import { BoundCurves } from '../bound-curves';
import { BORDER_STYLE } from '../../css/property-descriptors/border-style';
import { Path } from '../path';
/**
 * Dependencies required for BorderRenderer
 */
export interface BorderRendererDependencies {
    ctx: CanvasRenderingContext2D;
}
/**
 * Path creation callbacks
 * The main CanvasRenderer retains path() and formatPath() methods,
 * so we inject them as callbacks to avoid duplication
 */
export interface PathCallbacks {
    path(paths: Path[]): void;
    formatPath(paths: Path[]): void;
}
/**
 * Border Renderer
 *
 * Specialized renderer for element borders.
 * Extracted from CanvasRenderer to improve code organization and maintainability.
 */
export declare class BorderRenderer {
    private readonly ctx;
    private pathCallbacks;
    constructor(deps: BorderRendererDependencies, pathCallbacks: PathCallbacks);
    /**
     * Render a solid border
     *
     * @param color - Border color
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     */
    renderSolidBorder(color: Color, side: number, curvePoints: BoundCurves): Promise<void>;
    /**
     * Render a double border
     * Falls back to solid border if width is too small
     *
     * @param color - Border color
     * @param width - Border width
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     */
    renderDoubleBorder(color: Color, width: number, side: number, curvePoints: BoundCurves): Promise<void>;
    /**
     * Render a dashed or dotted border
     *
     * @param color - Border color
     * @param width - Border width
     * @param side - Border side (0=top, 1=right, 2=bottom, 3=left)
     * @param curvePoints - Border curve points
     * @param style - Border style (DASHED or DOTTED)
     */
    renderDashedDottedBorder(color: Color, width: number, side: number, curvePoints: BoundCurves, style: BORDER_STYLE): Promise<void>;
}
