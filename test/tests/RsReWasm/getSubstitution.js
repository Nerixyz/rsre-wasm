const {describe, it} = require("@jest/globals");
const {_getSubstitution} = require("../../../pkg/glue/node.glue");

describe('getSubstitution', function () {
    it('should substitute nothing if there is nothing to substitute', function () {
        expect(_getSubstitution("", "string", 1, [], {}, "b")).toBe("b")
    });
    it('should substitute $$ to $', function () {
        expect(_getSubstitution("match", "this is a match", 10, [], {}, "match$$")).toBe("match$");
    });
    it('should substitute $& with the matched string', function () {
        expect(_getSubstitution("match", "i match the string", 2, [], {}, "have $&ed")).toBe("have matched");
    });
    it('should substitute $` with the head of the string', function () {
        expect(_getSubstitution("match", "i match the", 2, [], {}, "have nothing. $`")).toBe("have nothing. i ");
    });
    it('should substitute $n with the correct group', function () {
        expect(_getSubstitution("abcd", "789abcdefg", 3, ["a", "b", "c", "d"], {}, "0$4$3$$38")).toBe("0dc$38");
    });
    it('should substitute $nn with the correct group', function () {
        expect(_getSubstitution("abcd", "789abcdefg", 3, [..."0123456789a"], {}, "0$10$3$$38")).toBe("092$38")
    });
    it('should substitute $<name> with the corresponding group', function () {
        expect(_getSubstitution("acb", "3abcdef", 1, [], {name: "test"}, "this is a $<name>")).toBe("this is a test");
    });
    it('should skip $ if there is nothing to substitute', function () {
        expect(_getSubstitution("", "string", 1, [], {}, "$r")).toBe("$r");
    });
    it('should substitute multiple groups', function () {
        expect(_getSubstitution("pro player pvc 22", "pro player pvc 22", 0, ["pvc", "22"], {name: "pvc"}, "noob $<name> ($2 y/o)")).toBe("noob pvc (22 y/o)")
    });
});