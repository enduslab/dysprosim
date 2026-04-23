/**
 * Origin Checker
 *
 * Provides origin checking functionality without global static state.
 * Each instance maintains its own anchor element and origin reference.
 *
 * Replaces the static methods in CacheStorage with instance-based approach.
 */
export declare class OriginChecker {
    private readonly link;
    private readonly origin;
    constructor(window: Window);
    /**
     * Get the origin (protocol + hostname + port) of a URL
     *
     * @param url - URL to parse
     * @returns Origin string (e.g., "https://example.com:8080")
     */
    getOrigin(url: string): string;
    /**
     * Check if a URL is from the same origin as the context
     *
     * @param src - URL to check
     * @returns true if same origin, false otherwise
     */
    isSameOrigin(src: string): boolean;
    /**
     * Get the current context origin
     *
     * @returns The origin of the context window
     */
    getContextOrigin(): string;
}
