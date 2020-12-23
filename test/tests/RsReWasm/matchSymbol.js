const {createMockRegex} = require("../../mocks");
const {describe, it} = require("@jest/globals");
describe('RsReWasm#matchSymbol', function () {
    it('should call matchSymbol when matching', function () {
        const mock = jest.fn(() => "null");
        const instance = createMockRegex("", {
            matchSymbol: mock
        });
        'abc1'.match(instance);
        expect(mock).toBeCalledTimes(1)
    });
});