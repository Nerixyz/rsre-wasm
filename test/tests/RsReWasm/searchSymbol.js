const {RsReWasm} = require("../../../pkg/glue/node.glue");

// https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@search

describe('RsReWasm[@@search]', function () {
    it('should search for the expression', function () {
        expect(new RsReWasm("-")[Symbol.search]('2016-01-02')).toBe(4);
    });
    it('should return -1 if the expression is not found', function () {
        expect(new RsReWasm("--")[Symbol.search]('2016-01-02')).toBe(-1);
    });
});