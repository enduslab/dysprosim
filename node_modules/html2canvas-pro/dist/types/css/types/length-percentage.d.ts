import { DimensionToken, NumberValueToken } from '../syntax/tokenizer';
import { CSSValue, CSSFunction } from '../syntax/parser';
export type LengthPercentage = DimensionToken | NumberValueToken;
export type LengthPercentageTuple = [LengthPercentage] | [LengthPercentage, LengthPercentage];
export declare const isLengthPercentage: (token: CSSValue) => token is LengthPercentage;
/**
 * Check if a token is a calc() function
 */
export declare const isCalcFunction: (token: CSSValue) => token is CSSFunction;
/**
 * Evaluate a calc() expression and convert to LengthPercentage token
 * Supports basic arithmetic: +, -, *, /
 * Note: Percentages in calc() are converted based on a context value
 */
export declare const evaluateCalcToLengthPercentage: (calcToken: CSSFunction, contextValue?: number) => LengthPercentage | null;
export declare const parseLengthPercentageTuple: (tokens: LengthPercentage[]) => LengthPercentageTuple;
export declare const ZERO_LENGTH: NumberValueToken;
export declare const FIFTY_PERCENT: NumberValueToken;
export declare const HUNDRED_PERCENT: NumberValueToken;
export declare const getAbsoluteValueForTuple: (tuple: LengthPercentageTuple, width: number, height: number) => [number, number];
export declare const getAbsoluteValue: (token: LengthPercentage, parent: number) => number;
