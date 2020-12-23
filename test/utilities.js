const {RegexWrapper} = require('../pkg/rsre_wasm_node');
const testData = require('./test-data.json');

/**
 * @param {string}path
 * @returns {Object}
 */
function getTestData(...path) {
    let obj = testData;
    for(const prop of path) obj = obj[prop];

    return obj;
}

/**
 * @param data
 * @returns {[RegexWrapper, string]}
 */
function createRegex(data) {
    expect(Array.isArray(data)).toBe(true);
    const [source] = data;
    return Array.isArray(source) ? [new RegexWrapper(source[0], source[1]), source[0]] : [new RegexWrapper(source), source];
}

module.exports = {
    getTestData,
    createRegex
}