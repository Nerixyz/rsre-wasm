const {RsReWasm} = require('../pkg/glue/node.glue');

/**
 *
 * @param {string | any[]} input
 * @param {Object} hooks
 * @return {RsReWasm}
 */
function createMockRegex(input, hooks) {
    const instance = new RsReWasm(...(typeof input === "string" ? [input] : input));
    for(const [key, value] of Object.entries(hooks)) {
        instance._base[key] = typeof value === "function" ? value.bind(instance._base) : value;
    }

    return instance
}

module.exports = {createMockRegex}