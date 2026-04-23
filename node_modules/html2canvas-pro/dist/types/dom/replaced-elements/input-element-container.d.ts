import { ElementContainer } from '../element-container';
import { Context } from '../../core/context';
export declare const CHECKBOX = "checkbox";
export declare const RADIO = "radio";
export declare const PASSWORD = "password";
export declare const INPUT_COLOR = 707406591;
export declare const PLACEHOLDER_COLOR = 1970632191;
export declare class InputElementContainer extends ElementContainer {
    readonly type: string;
    readonly checked: boolean;
    readonly value: string;
    readonly isPlaceholder: boolean;
    constructor(context: Context, input: HTMLInputElement);
}
