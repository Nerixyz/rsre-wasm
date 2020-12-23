const {RsReWasm} = require("../../../pkg");

const {describe, it} = require("@jest/globals");
describe('RsReWasm[@@matchAll]', function () {
    it('should return the same matches as the native regex', function () {
        const regex = new RsReWasm("(?<some>a)bc\\d", "g");
        const native = /(?<some>a)bc\d/g;
        const testStr = "abc1 abc2 abc3 abc4 abc5";
        expect([...testStr.matchAll(regex)]).toEqual([...testStr.matchAll(native)]);
    });
    it('should return an "empty" iterator if there are no matches', function () {
        const regex = new RsReWasm("(?<some>a)bc\\d", "g");
        const native = /(?<some>a)bc\d/g;
        const testStr = "abc abc abc abc abc";
        expect([...testStr.matchAll(regex)]).toEqual([...testStr.matchAll(native)]);
    });
    it('should support multiple named groups', function () {
        const regex = new RsReWasm("(?<year>\\d+)-(?<month>\\d+)-(?<day>\\d+)", "g");
        const native = /(?<year>\d+)-(?<month>\d+)-(?<day>\d+)/g;
        const testStr = "Foo happened on 2020-03-02 and bar happened on 2020-04-10.";
        expect([...testStr.matchAll(regex)]).toEqual([...testStr.matchAll(native)]);
    });
});