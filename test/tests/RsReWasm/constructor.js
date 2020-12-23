const {RsReWasm} = require("../../../pkg/glue/node.glue");

describe('RsReWasm.constructor', function () {
    it('should take flags and a source', function () {
        const regex = new RsReWasm("test", "giy");
        expect(regex.source).toBe("test");
        expect(regex.flags).toBe("giy");
    });
    it('should default flags to the empty string', function () {
        const regex = new RsReWasm("test");
        expect(regex.source).toBe("test");
        expect(regex.flags).toBe("");
    });
    it('should take a RegExp as input', function () {
        const regex = new RsReWasm(/test/giy);
        expect(regex.source).toBe("test");
        expect(regex.flags).toBe("giy");
    });
});