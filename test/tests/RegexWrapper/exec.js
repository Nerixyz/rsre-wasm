const {RegexWrapper} = require("../../../pkg/rsre_wasm_node");

const {getTestData, createRegex} = require("../../utilities");
const {describe, it} = require("@jest/globals");

// https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec

describe('RegexWrapper#exec',  () => {
    describe("snapshots", () => {
        const data = getTestData('exec');

        for(const test of data)
            execRegex(test);
    });
    describe('specifics', () => {
        function testAgainstNative(regex, native, input, {iterations = 1, initialIndex = 0} = {}) {
            regex.lastIndex = initialIndex;
            native.lastIndex = initialIndex;
            for (let i = 0; i < iterations; i++) {
                expect(regex.lastIndex).toBe(native.lastIndex);
                expect(JSON.parse(regex.exec(input))).toEqual(nativeExec(native, input));
                expect(regex.lastIndex).toBe(native.lastIndex);
            }
        }
        describe('sticky-flag', () => {
            it('should match', () => {
                testAgainstNative(
                    new RegexWrapper("(?<start>sti)cky", "y"),
                    /(?<start>sti)cky/y,
                    "sticky string", {iterations: 2});
            });
            it('should not match a regex starting at 1+lastIndex', () => {
                testAgainstNative(
                    new RegexWrapper("(?<start>sti)cky", "y"),
                    /(?<start>sti)cky/y,
                    " sticky string");
            });
            it('should take the lastIndex into account', () => {
                testAgainstNative(
                    new RegexWrapper("^foo", "y"),
                    /^foo/y,
                    "..foo", {initialIndex: 2});
                testAgainstNative(
                    new RegexWrapper("^foo", "my"),
                    /^foo/my,
                    "..foo", {initialIndex: 2});
                testAgainstNative(
                    new RegexWrapper("^foo", "my"),
                    /^foo/my,
                    ".\nfoo", {initialIndex: 2});
            });
        });
        describe('ignoreCase-flag', ()  => {
            it('should respect the flag', function () {
                testAgainstNative(
                    new RegexWrapper("test", "i"),
                    /test/i,
                    "Test");
            });
            it('should respect the case if no flag is set', function () {
                testAgainstNative(
                    new RegexWrapper("test"),
                    /test/,
                    "Test");
            });
        });
        describe('multiline-flag', function () {
            it('should respect the flag', function () {
                testAgainstNative(
                    new RegexWrapper("^football", "m"),
                    /^football/m,
                    "rugby\nfootball");
            });
            it('should respect the absence', function () {
                testAgainstNative(
                    new RegexWrapper("^football"),
                    /^football/,
                    "rugby\nfootball");
            });
        });
        describe('named capture groups', () => {
            it('should return the matched groups', function () {
                testAgainstNative(
                    new RegexWrapper("const (?<variableName>\\w+) = (?<value>.+)"),
                    /const (?<variableName>\w+) = (?<value>.+)/,
                    "const myVariable = 7 ** 2");
            });
        });
        describe('groups', () => {
            it('should set undefined if no value is found', function () {
                testAgainstNative(
                    new RegexWrapper("(xd)|(lp)"),
                    /(xd)|(lp)/,
                    "xqcL xd lp mit kev");
            });
        });
    })
});

function execRegex(data) {
    const [regex, source] = createRegex(data);
    it(`/${source}/ should match the snapshot`, () => {
        const singleMatch = (str) => {
            const preIdx = regex.lastIndex;
            const execResult = regex.exec(str);
            const postIdx = regex.lastIndex;

            return {preIdx, execResult, postIdx};
        }
        if(Array.isArray(data[1])) {
            const results = [];
            if (data[1].length === 2 && typeof data[1][1] === "number") {
                const [str, iterations] = data[1];
                for (let i = 0; i < iterations; i++) results.push(singleMatch(str));
            } else {
                for (const str of data[1]) results.push(singleMatch(str));
            }
            expect(results).toMatchSnapshot();
        }else {
            expect(singleMatch(data[1])).toMatchSnapshot();
        }
    });
}

function nativeExec(regex, str) {
    const res = regex.exec(str);
    if(res === null) return res;
    return {matches: [...res].map(x => typeof x === "undefined" ? null : x), groups: res.groups, index: res.index, input: res.input};
}