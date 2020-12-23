const {describe, it} = require("@jest/globals");
const {RsReWasm} = require("../../../pkg/glue/node.glue");

describe('RsReWasm[@@split]', function () {
    function testAgainstNative(regex, native, str, limit = 2 ** 32 - 1) {
        expect(regex[Symbol.split](str, limit)).toEqual(native[Symbol.split](str, limit));
    }

    it('should split with a basic regex', function () {
        testAgainstNative(new RsReWasm("-"), /-/, "2016-01-02");
    });
    it('should not split if the regex does not match', function () {
        testAgainstNative(new RsReWasm("\\+"), /\+/, "2016-01-02");
    });
    it('should include matched groups', function () {
        testAgainstNative(new RsReWasm("-(.)-"), /-(.)-/, "2016-a-01-b-02");
    });
    it('should take the limit into account', function () {
        testAgainstNative(new RsReWasm("-"), /-/, "2016-a-01-b-02", 3);
    });
});