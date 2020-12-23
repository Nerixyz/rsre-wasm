const {describe, it} = require("@jest/globals");
const {RsReWasm} = require("../../../pkg/glue/node.glue");

describe('RsReWasm[@@replace]', function () {
    function testAgainstNative(regex, native, str, replacement) {
        expect(regex[Symbol.replace](str, replacement)).toBe(native[Symbol.replace](str, replacement));
    }
    it('should stringify the replacement value', function () {
        testAgainstNative(new RsReWasm("xd"), /xd/, "lol xd rofl");
    });
    it('should replace properly', function () {
        testAgainstNative(new RsReWasm("xd"), /xd/, "lol xd rofl", "xqcL");
    });
    it('should replace multiple occurrences', function () {
        testAgainstNative(new RsReWasm("xd", "g"), /xd/g, "lol xd rofl xd ex op", "xqcL");
    });
    it('should substitute', function () {
        testAgainstNative(new RsReWasm("pro player (?<name>\\w+) (\\d+)", "g"), /pro player (?<name>\w+) (\d+)/g, "the one pro player pvc 22 is old but the other pro player frozen 61 is older", "noob $<name> ($2 y/o)");
    });
    it('should call the proved function', function () {
        const mock = jest.fn(() => "nymnL");
        testAgainstNative(new RsReWasm("pro player (?<name>\\w+) (\\d+)", "g"), /pro player (?<name>\w+) (\d+)/g, "the one pro player pvc 22 is old but the other pro player frozen 61 is older", mock);
        expect(mock.mock.calls[0]).toEqual(mock.mock.calls[2]);
        expect(mock.mock.calls[1]).toEqual(mock.mock.calls[3]);
    });
});