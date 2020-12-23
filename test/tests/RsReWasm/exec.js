const {describe, it} = require('@jest/globals');
const {createMockRegex} = require('../../mocks');

describe('RsReWasm#exec', function () {
    it('should return the correct result', function () {
        const instance = createMockRegex('', {
            exec: () => JSON.stringify({
                matches: ['abc', 'b'],
                groups: {test: 'b'},
                index: 2,
                input: '01abc02',
            })
        });
        const result = instance.exec('');
        expect(result).not.toBeNull();
        expect(result[0]).toBe('abc');
        expect(result[1]).toBe('b');
        expect(result).toHaveProperty('groups', {test: 'b'});
        expect(result).toHaveProperty('index', 2);
        expect(result).toHaveProperty('input', '01abc02');
    });
    it('should return null if there is no match', function () {
        const instance = createMockRegex('', {
            exec: () => JSON.stringify(null)
        });
        expect(instance.exec('')).toBeNull()
    });
    it('should throw an Error if an error occurred', function () {
        const instance = createMockRegex('', {
            exec: () => JSON.stringify({
                error: 'Test Message'
            })
        });
        expect(() => instance.exec('')).toThrow(new Error('Test Message'))
    });
});