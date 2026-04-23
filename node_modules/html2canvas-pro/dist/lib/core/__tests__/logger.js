"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
describe('logger', () => {
    let infoSpy;
    beforeEach(() => {
        infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
            // do nothing
        });
    });
    afterEach(() => {
        infoSpy.mockRestore();
    });
    it('should call console.info when logger enabled', () => {
        const id = Math.random().toString();
        const logger = new logger_1.Logger({ id, enabled: true });
        logger.info('testing');
        expect(infoSpy).toHaveBeenLastCalledWith(id, expect.stringMatching(/\d+ms/), 'testing');
    });
    it("shouldn't call console.info when logger disabled", () => {
        const id = Math.random().toString();
        const logger = new logger_1.Logger({ id, enabled: false });
        logger.info('testing');
        expect(infoSpy).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=logger.js.map