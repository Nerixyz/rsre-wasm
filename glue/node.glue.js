const {RegexWrapper} = require('../rsre_wasm_node.js');

function esAssert(cond, err) {
    if(!cond) {
        throw new TypeError(err);
    }
}

/**
 *
 * @param {string} matched
 * @param {string} str
 * @param {number} position
 * @param {string[]} captures
 * @param {Record<string, string>} namedCaptures
 * @param {string} replacement
 * @return {string}
 */
function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
    esAssert(typeof matched === "string", "Expected matched to be of type string");
    const matchLength = matched.length;
    esAssert(typeof str === "string", "Expected st to be of type string");
    const stringLength = str.length;
    esAssert(position <= stringLength, "Expected position to be less than stringLength");
    esAssert(Array.isArray(captures), "Expected captures to be an Array");
    esAssert(typeof replacement === "string", "Expected replacement to be of type string");
    const tailPos = position + matchLength;
    const m = captures.length;

    let replacedReplacement = '';
    let lastReplPos = -1;
    let i = -1;
    while((i = replacement.indexOf('$', i)) !== -1) {
        let consumed = 1;
        let nextChar = replacement[i + consumed];
        if(nextChar === undefined) break;
        let replStr = null;
        switch (nextChar) {
            case '$': replStr = '$'; break;
            case '&': replStr = matched; break;
            case '`': replStr = str.substring(0, position); break;
            case "'": replStr = tailPos >= stringLength ? '' : str.substring(tailPos); break;
            case '<': {
                if(!namedCaptures) {
                    replStr = '$<';
                    break;
                }
                // '$<name>'
                //  i12
                const nextIdx = replacement.indexOf('>', i + 2);
                if(nextIdx === -1) {
                    replStr = '$<';
                    break;
                }
                const groupName = replacement.substring(i + 2, nextIdx);
                consumed = 1 + groupName.length + 1;
                replStr = namedCaptures[groupName] || '';
                break;
            }
            default: {
                if(['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(nextChar)) {
                    let nextNum = Number(nextChar);
                    const secondDigit = replacement[i + 2]
                    if(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(secondDigit)) {
                        consumed = 2;
                        nextNum = Number(nextChar + secondDigit);
                    }
                    if(nextNum <= m) {
                        replStr = captures[nextNum - 1] || '';
                    }
                }
                break;
            }
        }

        if(replStr === null) {
            i++;
            continue;
        }
        if(lastReplPos === -1)
            lastReplPos = 0;
        if(lastReplPos !== i)
            replacedReplacement += replacement.substring(lastReplPos, i);

        replacedReplacement += replStr;

        i += consumed + 1;
        lastReplPos = i;
    }
    if(lastReplPos === -1)
        return replacement;

    return replacedReplacement + replacement.substring(lastReplPos);
}

module.exports = {
    RsReWasm: (() => {
        const hasFinalizationRegistry = !!globalThis.FinalizationRegistry;
        const reFinalizationRegistry = hasFinalizationRegistry ? new FinalizationRegistry(wrapper => {
            wrapper.free();
        }) : undefined;
        // can't extend RegExp, because it would prevent this class from using 'lastIndex', it still acts like a RegEx
        const klass = class RsReWasm /* extends RegExp */ {
            constructor(...args) {
                //super(...args);
                if(args[0] instanceof RegExp || args[0] instanceof klass) {
                    args = [args[0].source, args[0].flags];
                }

                /** @type RegexWrapper */
                this._base = new RegexWrapper(...args);

                if(hasFinalizationRegistry) {
                    reFinalizationRegistry.register(this, this._base, this);
                }
            }

            /**
             *
             * @param result
             * @return {RegExpExecArray}
             * @private
             */
            _buildMatchArray(result) {
                const arr = result.matches.map(m => m === null ? undefined : m);
                arr.groups = result.groups;
                arr.input = result.input;
                arr.index = result.index;

                return arr;
            }

            /**
             *
             * @param {string} string
             * @return {null|RegExpExecArray}
             */
            exec(string) {
                const result = JSON.parse(this._base.exec(string));
                if(result === null) return result;
                if(result.error) throw new Error(result.error);

                return this._buildMatchArray(result)
            }

            /**
             *
             * @param {string} string
             * @return {boolean}
             */
            test(string) {
                return this._base.test(string);
            }

            /**
             * @param {string} target
             * @return {null|RegExpMatchArray}
             */
            [Symbol.match](target) {
                const result = JSON.parse(this._base.matchSymbol(target));
                if(result === null) return result;
                if(result.error) throw new Error(result.error);

                return result;
            }

            /**
             *
             * @param {string} target
             * @return {Iterator<RegExpMatchArray>}
             */
            [Symbol.matchAll](target) {
                const result = JSON.parse(this._base.matchAllSymbol(target));
                if(result === null) return {next: () => ({value: undefined, done: true})};
                if(result.error) throw new Error(result.error);

                return (function* GlueIterator(that) {
                    for(const item of result) {
                        yield that._buildMatchArray(item);
                    }
                })(this);
            }

            // https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
            /**
             *
             * @param {string} source
             * @param {string} replaceValue
             * @return {string}
             */
            [Symbol.replace](source, replaceValue) {
                source = String(source);
                /** @type {RegExpMatchArray[]} */
                const results = (this.global ? [...this[Symbol.matchAll](source)] : [this.exec(source)]).filter(res => res !== null);
                if(results.length === 0) return source;
                let accumulatedResult = '';
                let nextSourcePosition = 0;
                const functionalReplace = typeof replaceValue === "function";
                if(!functionalReplace) replaceValue = String(replaceValue);
                for (const result of results) {
                    const matched = result[0];
                    const position = Math.max(Math.min(result.index, source.length), 0);
                    const captures = result.slice(1);
                    const namedCaptures = result.groups;

                    let replacement;
                    if(functionalReplace) {
                        const replValue = replaceValue.apply(undefined, [matched, ...captures, position, source, namedCaptures]);
                        replacement = String(replValue);
                    } else {
                        replacement = getSubstitution(matched, source, position, captures, namedCaptures, replaceValue);
                    }
                    if(position >= nextSourcePosition) {
                        accumulatedResult += source.substring(nextSourcePosition, position) + replacement;
                        nextSourcePosition = position + matched.length;
                    }
                }
                if(nextSourcePosition >= source.length) return accumulatedResult;
                return accumulatedResult + source.substring(nextSourcePosition);
            }

            /**
             *
             * @param {string} string
             * @return {number}
             */
            [Symbol.search](string) {
                string = String(string);
                const previousLastIndex = this.lastIndex;
                if(previousLastIndex !== 0)
                    this.lastIndex = 0;

                const result = this.exec(string);
                const currentLastIndex = this.lastIndex;
                if(currentLastIndex !== previousLastIndex)
                    this.lastIndex = previousLastIndex;

                if(result === null) return -1;
                return result.index;
            }

            [Symbol.split](string, limit) {
                string = String(string);
                // use a sticky regex
                const splitter = this.sticky ? this : new RsReWasm(this.source, this.flags + 'y');
                const array = [];
                limit = typeof limit === "undefined" ? 2 ** 32 -1 : limit;
                if(limit === 0) return array;
                if(string.length === 0) {
                    const result = splitter.exec(string);
                    if(result !== null) return array;

                    array.push(string);
                    return array;
                }
                let startIdx = 0, endIdx = 0;
                while(endIdx < string.length) {
                    splitter.lastIndex = endIdx;
                    const exec = splitter.exec(string);
                    const e = Math.min(splitter.lastIndex, string.length);
                    if(exec === null || e === startIdx) {
                        // the regex is sticky, so we'll advance by 1
                        endIdx += 1;
                        continue;
                    }
                    if(array.push(string.substring(startIdx, endIdx)) === limit)
                        return array;

                    for(let i = 1; i < exec.length; i++) {
                        if(array.push(exec[i]) === limit)
                            return array;
                    }
                    startIdx = endIdx = e;
                }
                array.push(string.substring(startIdx));
                return array;
            }

            compile() {
                // unimplemented
            }

            toString() {
                return `/${this.source}/${this.flags}`;
            }

            free() {
                if(hasFinalizationRegistry) {
                    reFinalizationRegistry.unregister(this);
                }
                return this._base.free();
            }
        };
        const defGetSet = (name) => {
            Object.defineProperty(klass.prototype, name, {
                get() {
                    return this._base[name]
                },
                set(value) {
                    this._base[name] = value
                },
                enumerable: false
            });
        };
        ['dotAll', 'flags', 'global', 'ignoreCase', 'lastIndex', 'multiline', 'source', 'sticky', 'unicode'].forEach(defGetSet);
        return klass;
    })(),
    _getSubstitution: getSubstitution
}