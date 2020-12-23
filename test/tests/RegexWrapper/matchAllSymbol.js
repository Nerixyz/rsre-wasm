const {describe, it} = require("@jest/globals");
const {RegexWrapper} = require("../../../pkg/rsre_wasm_node");

describe('RegexWrapper#matchAllSymbol', function () {
    function testAgainstNative(regex, native, input) {
        expect(JSON.parse(regex.matchAllSymbol(input))).toEqual(nativeMatchAll(native, input));
        expect(regex.lastIndex).toBe(native.lastIndex);
    }
    it('should return all matches', function () {
        testAgainstNative(new RegexWrapper("(?<some>abc\\d)", "g"),/(?<some>abc\d)/g, "abc1 abc2 abc3 abc4 abc5")
    });
});

function nativeMatchAll(regex, str) {
    const arr = [...str.matchAll(regex)];
    return arr.map(res => ({matches: [...res], groups: res.groups, index: res.index, input: res.input}));
}