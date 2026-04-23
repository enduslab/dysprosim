"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.image = exports.isRadialGradient = exports.isLinearGradient = void 0;
exports.isSupportedImage = isSupportedImage;
const linear_gradient_1 = require("./functions/linear-gradient");
const _prefix_linear_gradient_1 = require("./functions/-prefix-linear-gradient");
const _webkit_gradient_1 = require("./functions/-webkit-gradient");
const radial_gradient_1 = require("./functions/radial-gradient");
const _prefix_radial_gradient_1 = require("./functions/-prefix-radial-gradient");
const isLinearGradient = (background) => {
    return background.type === 1 /* CSSImageType.LINEAR_GRADIENT */;
};
exports.isLinearGradient = isLinearGradient;
const isRadialGradient = (background) => {
    return background.type === 2 /* CSSImageType.RADIAL_GRADIENT */;
};
exports.isRadialGradient = isRadialGradient;
exports.image = {
    name: 'image',
    parse: (context, value) => {
        if (value.type === 22 /* TokenType.URL_TOKEN */) {
            const image = { url: value.value, type: 0 /* CSSImageType.URL */ };
            context.cache.addImage(value.value);
            return image;
        }
        if (value.type === 18 /* TokenType.FUNCTION */) {
            const imageFunction = SUPPORTED_IMAGE_FUNCTIONS[value.name];
            if (typeof imageFunction === 'undefined') {
                throw new Error(`Attempting to parse an unsupported image function "${value.name}"`);
            }
            return imageFunction(context, value.values);
        }
        throw new Error(`Unsupported image type ${value.type}`);
    }
};
function isSupportedImage(value) {
    return (!(value.type === 20 /* TokenType.IDENT_TOKEN */ && value.value === 'none') &&
        (value.type !== 18 /* TokenType.FUNCTION */ || !!SUPPORTED_IMAGE_FUNCTIONS[value.name]));
}
const SUPPORTED_IMAGE_FUNCTIONS = {
    'linear-gradient': linear_gradient_1.linearGradient,
    '-moz-linear-gradient': _prefix_linear_gradient_1.prefixLinearGradient,
    '-ms-linear-gradient': _prefix_linear_gradient_1.prefixLinearGradient,
    '-o-linear-gradient': _prefix_linear_gradient_1.prefixLinearGradient,
    '-webkit-linear-gradient': _prefix_linear_gradient_1.prefixLinearGradient,
    'radial-gradient': radial_gradient_1.radialGradient,
    '-moz-radial-gradient': _prefix_radial_gradient_1.prefixRadialGradient,
    '-ms-radial-gradient': _prefix_radial_gradient_1.prefixRadialGradient,
    '-o-radial-gradient': _prefix_radial_gradient_1.prefixRadialGradient,
    '-webkit-radial-gradient': _prefix_radial_gradient_1.prefixRadialGradient,
    '-webkit-gradient': _webkit_gradient_1.webkitGradient
};
//# sourceMappingURL=image.js.map