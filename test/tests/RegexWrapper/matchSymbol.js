const {it, describe} = require("@jest/globals");
const {RegexWrapper} = require("../../../pkg/rsre_wasm_node");

describe('RegexWrapper#matchSymbol', () => {
    it('should run exec if the regex is not global', () => {
        const regex = new RegexWrapper("some (expression)");
        expect(regex.matchSymbol("some expression")).toEqual(regex.exec("some expression"));
    });
    it('should not run exec if the regex is global', () => {
        const regex = new RegexWrapper("some (expression)", "g");
        expect(regex.matchSymbol("some expression")).not.toEqual(regex.exec("some expression"));
    });
    it('should return null if no matches are found', () => {
        const regex = new RegexWrapper("some (expression)", "g");
        expect(regex.matchSymbol("not matching")).toEqual("null");
    });
    it('should return all matches', () => {
        const regex = new RegexWrapper("abc\\d", "g");
        expect(JSON.parse(regex.matchSymbol("abc1 abc2 abc3 abc4 abc5"))).toEqual([
            "abc1", "abc2", "abc3", "abc4", "abc5"
        ]);
    });
    it('should return one match if there is only one', () => {
        const regex = new RegexWrapper("abc\\d", "g");
        expect(JSON.parse(regex.matchSymbol("abc1 def1"))).toEqual(["abc1"]);
    });
});